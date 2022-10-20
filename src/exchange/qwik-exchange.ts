import { Exchange, Operation, OperationResult } from '@urql/core';
import { pipe, tap } from 'wonka';

export type Cache = {
  // A list of operations to wake up: { __typename: Operation.key[] }
  dependencies: Record<string, number[]>;

  // A Qwik signal used to wake up a subscription
  triggers: Record<number, { value: number }>;
};

/**
 * This exchange allows us to resume SSR query subscriptions on the client
 * and watch the cache for updates to queries.
 */
class QwikExchange {
  constructor(private readonly cache: Cache) {}

  /**
   * Process outgoing requests.
   * On the server we simply add Urql Operations to a store for resuming on the
   * client.
   */
  processRequest(operation: Operation) {
    const context = operation.context;
    const isWatched = context.watch;

    // Store watched requests for retriggering later
    if (isWatched) {
      this.cache.triggers[operation.key] = operation.context.trigger;
    }

    // Use the cache first for future requests
    if (isWatched && context.trigger.value > 0) {
      context.requestPolicy = 'cache-first';
    }
  }

  /** Process response by updating watch stores or triggering watch refetches */
  processResponse(result: OperationResult) {
    const key = result.operation.key;
    const trigger = this.cache.triggers[key];

    // Update all dependent queries if new data is returned
    if (result.operation.context.meta?.cacheOutcome !== 'hit' && result.data) {
      this.triggerDependencies(result.data, new Set([key]));
    }

    if (trigger) {
      // Set any new dependencies returned from the request
      if (trigger && trigger.value === 0 && result.data) {
        this.setDependencies(key, result.data);
      }
    }
  }

  /**
   * Traverse through results and store a lookup of which queries are dependant
   * on which objects. These are then used to trigger refetches if the target
   * objects are ever updated.
   */
  private setDependencies(key: number, data: any) {
    if (typeof data !== 'object') {
      return;
    } else if (Array.isArray(data)) {
      if (data.length === 0) {
        return;
      }

      this.setDependencies(key, data[0]);
    }

    const id = data.id;
    const __typename = data.__typename;

    if (id && __typename) {
      const depKey = `${__typename}:${id}`;

      if (!this.cache.dependencies[depKey]) {
        this.cache.dependencies[depKey] = [key];
      } else {
        this.cache.dependencies[depKey].push(key);
      }
    }

    const fields = Object.keys(data);

    for (const field of fields) {
      this.setDependencies(key, data[field]);
    }
  }

  /**
   * Loop through query results and trigger a refetch for any dependant queries
   */
  private triggerDependencies(data: any, hits: Set<number>) {
    if (typeof data !== 'object') {
      return;
    } else if (Array.isArray(data)) {
      if (!data.length || typeof data[0] !== 'object') {
        return;
      }
      for (const item of data) {
        this.triggerDependencies(item, hits);
      }
    }

    const id = data.id;
    const __typename = data.__typename;

    if (id && __typename) {
      const dependencies = this.cache.dependencies[`${__typename}:${id}`];

      if (dependencies) {
        for (const dep of dependencies) {
          if (!hits.has(dep)) {
            hits.add(dep);
            this.cache.triggers[dep].value++;
          }
        }
      }
    }

    const fields = Object.keys(data);

    for (const field of fields) {
      this.triggerDependencies(data[field], hits);
    }
  }

  run: Exchange = ({ forward }) => {
    return (ops$) => {
      return pipe(
        ops$,
        tap((req) => this.processRequest(req)),
        forward,
        tap((res) => this.processResponse(res))
      );
    };
  };
}

export const qwikExchange = (cache: Cache): Exchange => {
  const exchange = new QwikExchange(cache);
  return exchange.run;
};
