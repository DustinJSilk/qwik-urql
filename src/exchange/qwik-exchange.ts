import { isServer } from '@builder.io/qwik/build';
import { Exchange, Operation, OperationResult } from '@urql/core';
import { OptimisticMutationConfig } from '@urql/exchange-graphcache';
import { pipe, tap } from 'wonka';

export type Cache = {
  // Dependencies between kind:id and subscription keys
  dependencies: Record<string, number[]>;

  // Qwik signals that trigger subscriptions to wake up
  triggers: Record<number, { value: number }>;
};

/**
 * This exchange allows us to resume SSR query subscriptions on the client
 * and watch the cache for updates to queries.
 */
export class QwikExchange {
  constructor(private readonly cache: Cache) {}

  /**
   * Process outgoing requests.
   * On the server we simply add Urql Operations to a store for resuming on the
   * client.
   */
  processRequest(operation: Operation) {
    const context = operation.context;

    // Store watched requests for retriggering later
    if (context.trigger) {
      this.cache.triggers[operation.key] = operation.context.trigger;
    }

    // Use the cache first after waking up
    if (context.trigger && context.trigger.value > 0) {
      context.requestPolicy = 'cache-first';
    }
  }

  /** Process response by updating watch stores or triggering watch refetches */
  processResponse(result: OperationResult) {
    const key = result.operation.key;
    const watchedQuery = this.cache.triggers[key];

    // Update all dependent queries if new data is returned
    if (result.operation.context.meta?.cacheOutcome !== 'hit' && result.data) {
      this.triggerDependencies(result.data, new Set([key]));
    }

    if (watchedQuery) {
      // Set any new dependencies returned from the request
      const trigger = result.operation.context.trigger;
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
    if (typeof data !== 'object' || !data) {
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
  triggerDependencies(data: any, hits: Set<number>) {
    if (typeof data !== 'object' || !data) {
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
      const key = `${__typename}:${id}`;
      const dependencies = this.cache.dependencies[key];

      if (dependencies) {
        for (const dep of dependencies) {
          if (!hits.has(dep)) {
            hits.add(dep);

            // Wake up the subscription
            this.cache.triggers[dep].value++;

            // Remove from cache
            delete this.cache.triggers[dep];
            delete this.cache.dependencies[key];
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

export type QwikExhangeOptions = {
  cache: Cache;
  optimistic?: OptimisticMutationConfig;
};

export const qwikExchange = (options: QwikExhangeOptions): Exchange => {
  const { cache, optimistic } = options;

  const exchange = new QwikExchange(cache);

  // Wrap each optimistic method so that it first wakes up any dependant queries
  if (!isServer && optimistic) {
    for (const key of Object.keys(optimistic)) {
      const fn = optimistic[key];

      optimistic[key] = (vars, cache, info) => {
        const result = fn(vars, cache, info);
        // Test subscribing now - if it works we can try synchronously waking
        // up subscriptions before returning the result.
        exchange.triggerDependencies(result, new Set());

        return result;
      };
    }
  }

  return exchange.run;
};
