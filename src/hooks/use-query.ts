import {
  noSerialize,
  NoSerialize,
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
  vars: Variables,
  context?: Partial<Omit<OperationContext, 'fetch'>> & { watch: boolean }
) => {
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

  useWatch$(async ({ track, cleanup }) => {
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

    const client = await clientCache.getClient({
      factory: clientStore.factory,
      qwikStore,
      authTokens: tokens,
      id: clientStore.id,
    });

    const request = client.query<Data, Variables>(query, vars, {
      ...context,
      fetch: fetchWithAbort(abortCtrl),
      trigger: watch ? trigger : undefined,
    });

    if (isServer) {
      const res = await request.toPromise();

      // Remove non-serializable fields
      delete res.operation.context.fetch;
      output.data = res.data;
    } else {
      const { unsubscribe } = pipe(
        request,
        subscribe((res) => {
          output.data = res.data;
        })
      );

      subscription.unsubscribe = noSerialize(unsubscribe);
    }
  });

  return useResource$<
    DeepOmit<
      OperationResult<Data, Variables>,
      { operation: never; error: never }
    >
  >(async ({ track }) => {
    track(output);

    // Wait forever if there is no output yet, to simulate loading
    if (!output.data) {
      await new Promise(() => undefined);
    }

    return output;
  });
};
