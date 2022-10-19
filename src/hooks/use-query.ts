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

  const trigger = useSignal(isServer ? 0 : 1);

  const subscription = useStore<{ unsubscribe?: NoSerialize<() => void> }>({});

  const output = useStore<
    DeepOmit<
      OperationResult<Data, Variables>,
      { operation: never; error: never }
    >
  >({} as any, { recursive: true });

  useWatch$(async ({ track, cleanup }) => {
    console.log('Running watch');
    if (trigger.value === 0) {
      console.log('Tracking watch trigger');
      track(trigger);
    }

    if (vars) {
      track(vars);
    }

    const abortCtrl = new AbortController();

    cleanup(() => {
      abortCtrl.abort();

      if (subscription.unsubscribe) {
        console.log('Cleaning up subscription');
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
      watch: true,
      ...context,
      fetch: fetchWithAbort(abortCtrl),
      trigger: trigger,
    });

    if (isServer) {
      console.log('Requesting data with promise');

      const res = await request.toPromise();
      console.log('Data returned by promise');

      // Remove non-serializable fields
      delete res.operation.context.fetch;
      output.data = res.data;
    } else {
      console.log('Setting up subscription');
      const { unsubscribe } = pipe(
        request,
        subscribe((res) => {
          console.log(
            'Subscription returned results ',
            (res.data as any)?.film?.title
          );
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
    console.log('Running resource');

    // Wait forever if there is no output yet, to simulate loading
    if (!output.data) {
      console.log('Resource waiting for results');
      await new Promise(() => undefined);
    }

    console.log('Returning resource');
    return output;
  });
};
