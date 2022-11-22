import {
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
  UrqlOptionsContext,
  UrqlQwikContext,
} from '../components/urql-provider';

export type UseQueryResponse<D, V extends AnyVariables> = DeepOmit<
  OperationResult<D, V>,
  { operation: never; error: never }
>;

export type UseQueryResource<D, V extends AnyVariables> = ResourceReturn<
  UseQueryResponse<D, V>
>;

type OptionalVars<D, V extends AnyVariables> = [
  query: TypedDocumentNode<D, V> & { kind: string },
  vars?: V,
  context?: Partial<Omit<OperationContext, 'fetch'>> & { watch: boolean }
];

type RequiredVars<D, V extends AnyVariables> = [
  query: TypedDocumentNode<D, V> & { kind: string },
  vars: V,
  context?: Partial<Omit<OperationContext, 'fetch'>> & { watch: boolean }
];

/**
 * Setting the context.watch option to false with not create a subscription
 * which can reduce the serialized load and give a very minor performance
 * benefit.
 *
 * @param query TypedDocumentNode created using gql`...`
 * @param vars Input variables for the query.
 * @param context Optional context to pass to Urql.
 *
 * @returns Qwik ResourceReturn to be used with a <Resource /> component
 */
export const useQuery = <D, V extends AnyVariables>(
  ...args: {} extends V ? OptionalVars<D, V> : RequiredVars<D, V>
): UseQueryResource<D, V> => {
  const [query, vars, context] = args;

  const clientStore = useContext(UrqlClientContext);
  const qwikStore = useContext(UrqlQwikContext);
  const tokens = useContext(UrqlAuthContext);
  const options = useContext(UrqlOptionsContext);
  const watch = context?.watch ?? options.watch ?? true;

  // Only set up a new subscription on the client after SSR
  const trigger = useSignal(isServer ? 0 : 1);

  const output = useStore<UseQueryResponse<D, V>>({} as any, {
    recursive: true,
  });

  // Client side wake-up and subscribe
  useWatch$(({ track, cleanup }) => {
    if (watch && trigger.value === 0) {
      track(trigger);
    }

    if (vars) {
      track(vars);
    }

    const abortCtrl = new AbortController();

    let unsubscribe: () => void;
    let isCleaned = false;

    cleanup(() => {
      isCleaned = true;
      abortCtrl.abort();

      if (unsubscribe) {
        unsubscribe();
      }
    });

    async function run() {
      const client = await clientCache.getClient({
        factory: clientStore.factory,
        qwikStore,
        authTokens: tokens,
        id: clientStore.id,
      });

      const request = client.query<D, V>(query, vars ?? ({} as V), {
        ...context,
        fetch: fetchWithAbort(abortCtrl),
        trigger: watch ? trigger : undefined,
      });

      // Cleanup could happen while waiting for the client so ignore the request
      if (isCleaned) {
        return;
      }

      const subscription = pipe(
        request,
        subscribe((res) => {
          output.data = res.data;
        })
      );

      unsubscribe = subscription.unsubscribe;
    }

    if (!isServer) {
      run();
    }
  });

  return useResource$<UseQueryResponse<D, V>>(async ({ track, cleanup }) => {
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

      const request = client.query<D, V>(query, vars ?? ({} as V), {
        ...context,
        fetch: fetchWithAbort(abortCtrl),
        trigger: watch ? trigger : undefined,
      });

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
