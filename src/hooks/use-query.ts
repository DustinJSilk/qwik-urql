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
import { AnyVariables, OperationResult, TypedDocumentNode } from '@urql/core';
import { DeepOmit } from 'ts-essentials';
import { pipe, subscribe } from 'wonka';
import { clientCache } from '../client/client-cache';
import {
  UrqlAuthContext,
  UrqlClientContext,
  UrqlQwikContext,
} from '../components/urql-provider';

export const useQuery = <Variables extends AnyVariables, Data = any>(
  query: TypedDocumentNode<Data, Variables> & {
    kind: string;
  },
  vars: Variables
) => {
  const clientStore = useContext(UrqlClientContext);
  const qwikStore = useContext(UrqlQwikContext);
  const tokens = useContext(UrqlAuthContext);

  // A signal used to rerun the watch to wake subscriptions up on the client
  const trigger = useSignal(isServer ? 0 : 1);

  // Allows us to unsubscribe during cleanup
  const subscription = useStore<{ unsubscribe?: NoSerialize<() => void> }>({});

  // The output of this hook which will be updated by the subscription
  const output = useStore<
    DeepOmit<
      OperationResult<Data, Variables>,
      { operation: never; error: never }
    >
  >({} as any);

  useWatch$(
    async ({ track, cleanup }) => {
      // Only wake subscriptions up once on the client
      if (trigger.value === 0) {
        track(trigger);
      }

      // Unsubscribe during cleanup
      cleanup(() => {
        if (subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      });

      // Get the GQL client
      const client = await clientCache.getClient({
        factory: clientStore.factory,
        qwikStore,
        authTokens: tokens,
        id: clientStore.id,
      });

      // Build the query
      const request = client.query<Data, Variables>(query, vars, {
        watch: true,
        trigger: trigger,
      });

      if (isServer) {
        // Run query as promise on the server
        const res = await request.toPromise();

        // Remove non-serializable fields from the result
        delete res.operation.context.fetch;

        // Update the UI
        output.data = res.data;
      } else {
        // Run query as a subscription on the client
        const { unsubscribe } = pipe(
          request,
          subscribe((res) => {
            console.log('New data: ', (res.data as any)?.film?.title);

            // Update the UI
            output.data = res.data;
          })
        );

        subscription.unsubscribe = noSerialize(unsubscribe);
      }
    },
    { eagerness: 'load' }
  );

  // Return a resource so that we can use the <Resource /> component
  return useResource$<
    DeepOmit<
      OperationResult<Data, Variables>,
      { operation: never; error: never }
    >
  >(async ({ track }) => {
    // Rerun each time the output changes.
    track(output);

    // Wait forever if there is no output yet, to simulate loading
    // Removing this has no effect on the subscription results
    if (!output.data) {
      await new Promise(() => undefined);
    }

    return output;
  });
};
