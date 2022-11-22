import {
  noSerialize,
  NoSerialize,
  ResourceReturn,
  useContext,
  useResource$,
  useSignal,
  useStore,
  useWatch$,
} from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';
import {
  AnyVariables,
  OperationContext,
  OperationResult,
  TypedDocumentNode,
} from '@urql/core';
import { DeepOmit } from 'ts-essentials';
import { pipe, subscribe } from 'wonka';
import { clientCache } from '../client/client-cache';
import { fetchWithAbort } from '../client/fetch-with-abort';
import {
  UrqlAuthContext,
  UrqlClientContext,
  UrqlQwikContext,
} from '../components/urql-provider';

export const useQuery = <Variables extends AnyVariables, Data = any>(
  query: TypedDocumentNode<Data, Variables> & {
    kind: string;
  },
  vars?: Variables,
  context?: Partial<Omit<OperationContext, 'fetch'>> & { watch: boolean }
): ResourceReturn<
  DeepOmit<OperationResult<Data, Variables>, { operation: never; error: never }>
> => {
  const clientStore = useContext(UrqlClientContext);
  const qwikStore = useContext(UrqlQwikContext);
  const tokens = useContext(UrqlAuthContext);
  const watch = context?.watch ?? true;

  // Only set up a new subscription on the client after SSR
  const trigger = useSignal(isServer ? 0 : 1);

  const subscription = useStore<{ unsubscribe?: NoSerialize<() => void> }>({});

  const output = useStore<
    DeepOmit<
      OperationResult<Data, Variables>,
      { operation: never; error: never }
    >
  >({} as any, { recursive: true });

  // Client side wake-up and subscribe
  useWatch$(({ track, cleanup }) => {
    if (watch && trigger.value === 0) {
      track(trigger);
    }

    if (vars) {
      track(vars);
    }

    const abortCtrl = new AbortController();

    cleanup(() => {
      abortCtrl.abort();

      if (subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    });

    async function run() {
      const client = await clientCache.getClient({
        factory: clientStore.factory,
        qwikStore,
        authTokens: tokens,
        id: clientStore.id,
      });

      const request = client.query<Data, Variables>(
        query,
        vars ?? ({} as Variables),
        {
          ...context,
          fetch: fetchWithAbort(abortCtrl),
          trigger: watch ? trigger : undefined,
        }
      );

      const { unsubscribe } = pipe(
        request,
        subscribe((res) => {
          output.data = res.data;
        })
      );

      // TODO: Cleanup could happen before subscribing. Make sure to check
      // if the component is still alive
      subscription.unsubscribe = noSerialize(unsubscribe);
    }

    if (!isServer) {
      run();
    }
  });

  return useResource$<
    DeepOmit<
      OperationResult<Data, Variables>,
      { operation: never; error: never }
    >
  >(async ({ track, cleanup }) => {
    // Make the fetch on the server without subscribing
    if (isServer) {
      const abortCtrl = new AbortController();
      cleanup(() => abortCtrl.abort());

      const client = await clientCache.getClient({
        factory: clientStore.factory,
        qwikStore,
        authTokens: tokens,
        id: clientStore.id,
      });

      const request = client.query<Data, Variables>(
        query,
        vars ?? ({} as Variables),
        {
          ...context,
          fetch: fetchWithAbort(abortCtrl),
          trigger: watch ? trigger : undefined,
        }
      );

      const res = await request.toPromise();
      delete res.operation.context.fetch;

      output.data = res.data;
    } else if (!output.data) {
      // Wait until data is injected into the output to simulate loading.
      // The track is only used to cancel the wait on the client.
      // TODO: Resimulate loading when making a new request with updated vars
      // if there is no optimistic response
      track(() => output.data);
      await new Promise(() => undefined);
    }

    return output;
  });
};
