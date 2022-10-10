import { isServer } from '@builder.io/qwik/build';
import { Exchange, Operation } from '@urql/core';
import { pipe, subscribe, tap } from 'wonka';

export type QwikExchangeCache = Record<
  string,
  { request: Operation<any, any>; response: any }
>;

/**
 * This exchange allows us to resume SSR query subscriptions on the client
 * and watch the cache for updates to queries.
 *
 * @param cache this must be an empty Qwik store
 */
export const qwikExchange = (cache: QwikExchangeCache): Exchange => {
  let hasResumedQueries = false;

  return ({ client, forward }) =>
    (ops$) => {
      const processIncomingOperation = (op: Operation) => {
        // Only resume subscriptions once on the client
        if (!isServer && !hasResumedQueries) {
          hasResumedQueries = true;

          // Resume all subscriptions
          for (const key of Object.keys(cache)) {
            const { request } = cache[key];
            // TODO: figure out how to unsubscribe when the resource cleans up
            pipe(
              client.executeRequestOperation(request as any),
              subscribe(() => undefined)
            );
          }
        }

        // Store any resumable queries in the cache
        if (op.context.resume && !cache[op.key]) {
          delete op.context.fetch;

          cache[op.key] = {
            request: op,
            response: op.context.store,
          };
        }

        // Only remove subscriptions on the client
        if (op.kind === 'teardown' && cache[op.key] && !isServer) {
          delete cache[op.key];
        }
      };

      return pipe(
        forward(pipe(ops$, tap(processIncomingOperation))),

        // A side effect that injects results back into their respective stores
        tap((result) => {
          // Grab the querys store from the exchange cache
          const store = cache[result.operation.key];

          if (store) {
            // Remove non-serializable fields
            delete result.operation.context.fetch;

            // Update the store with the new response
            store.response.data = result.data;
            store.response.error = result.error;
            store.response.extensions = result.extensions;
            store.response.hasNext = result.hasNext;
            store.response.operation = result.operation;
            store.response.stale = result.stale;
          }
        })
      );
    };
};
