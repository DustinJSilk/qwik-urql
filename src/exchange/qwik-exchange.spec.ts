import { Operation } from '@urql/core';
import { expect, test } from 'vitest';
import { Cache, QwikExchange } from './qwik-exchange';

test(`[QwikExchange]: Should store request triggers`, async () => {
  const cache: Cache = { dependencies: {}, triggers: {} };
  const exchange = new QwikExchange(cache);

  const operation = {
    key: '1',
    context: { trigger: { value: 0 } },
  } as unknown as Operation;

  exchange.processRequest(operation);

  expect(cache.triggers['1']).toEqual({ value: 0 });
});

test(`[QwikExchange]: Should set nested dependencies`, async () => {
  const result1 = {
    operation: {
      key: 1,
      context: {
        trigger: { value: 0 },
        // Force the exchange to not wake up and remove triggers for this test
        meta: { cacheOutcome: 'hit' },
      },
    } as any as Operation,
    data: {
      addFilm: {
        title: 'title',
        id: 'id',
        __typename: '__typename',
        nested: {
          title: 'title',
          id: 'id',
          __typename: '__nested',
          nested: {
            title: 'title',
            id: 'id',
            __typename: '__double_nested',
          },
        },
      },
    },
  };

  const result2 = {
    operation: {
      key: 2,
      context: {
        trigger: { value: 0 },
        // Force the exchange to not wake up and remove triggers for this test
        meta: { cacheOutcome: 'hit' },
      },
    } as any as Operation,
    data: {
      addFilm: {
        title: 'title',
        id: 'id',
        __typename: '__typename',
        nested: {
          title: 'title',
          id: 'id',
          __typename: '__nested',
        },
      },
    },
  };

  const cache: Cache = {
    dependencies: {},
    triggers: {
      1: { value: 0 },
      2: { value: 0 },
    },
  };

  const exchange = new QwikExchange(cache);

  exchange.processResponse(result1);
  exchange.processResponse(result2);

  expect(cache.dependencies[`__typename:id`]).toEqual([1, 2]);
  expect(cache.dependencies[`__nested:id`]).toEqual([1, 2]);
  expect(cache.dependencies[`__double_nested:id`]).toEqual([1]);
});

test(`[QwikExchange]: Should set dependencies with null fields`, async () => {
  const result = {
    operation: {
      key: 1,
      context: {
        trigger: { value: 0 },
      },
    } as any as Operation,
    data: {
      addFilm: {
        title: 'title',
        id: 'id',
        subtitle: null,
        __typename: '__typename',
        nested: {
          title: 'title',
          id: 'id',
          subtitle: null,
          __typename: '__nested',
        },
      },
    },
  };

  const cache: Cache = {
    dependencies: {},
    triggers: {
      1: { value: 0 },
    },
  };

  const exchange = new QwikExchange(cache);

  exchange.processResponse(result);

  expect(cache.dependencies[`__typename:id`]).toEqual([1]);
  expect(cache.dependencies[`__nested:id`]).toEqual([1]);
});

test(`[QwikExchange]: Should do nothing for objects without IDs`, async () => {
  const result = {
    operation: {
      key: 1,
      context: {
        trigger: { value: 0 },
      },
    } as any as Operation,
    data: {
      addFilm: {
        title: 'title',
        __typename: '__typename',
      },
    },
  };

  const cache: Cache = {
    dependencies: {},
    triggers: {
      1: { value: 0 },
    },
  };

  const exchange = new QwikExchange(cache);

  exchange.processResponse(result);

  expect(cache.dependencies).toEqual({});
});

test(`[QwikExchange]: Should wake up subscriptions for new data`, async () => {
  const result = {
    operation: {
      key: 1,
      context: {
        trigger: { value: 0 },
      },
    } as any as Operation,
    data: {
      addFilm: {
        title: 'title',
        id: 'id',
        __typename: '__typename',
      },
    },
  };

  let value = 0;

  const cache: Cache = {
    dependencies: {
      '__typename:id': [2],
    },
    triggers: {
      1: { value: 0 },
      2: {
        get value() {
          return value;
        },
        set value(val: number) {
          value = val;
        },
      },
    },
  };

  const exchange = new QwikExchange(cache);

  exchange.processResponse(result);

  expect(value).toBe(1);
});

test(`[QwikExchange]: Should not wake up subscriptions with cache data`, async () => {
  const result = {
    operation: {
      key: 1,
      context: {
        trigger: { value: 0 },
        meta: { cacheOutcome: 'hit' },
      },
    } as any as Operation,
    data: {
      addFilm: {
        title: 'title',
        id: 'id',
        __typename: '__typename',
      },
    },
  };

  let value = 0;

  const cache: Cache = {
    dependencies: {
      '__typename:id': [2],
    },
    triggers: {
      1: { value: 0 },
      2: {
        get value() {
          return value;
        },
        set value(val: number) {
          value = val;
        },
      },
    },
  };

  const exchange = new QwikExchange(cache);

  exchange.processResponse(result);

  expect(value).toBe(0);
});

test(`[QwikExchange]: Should clean up triggers and dependencies after waking up`, async () => {
  const result = {
    operation: {
      key: 5,
      context: {
        trigger: { value: 0 },
      },
    } as any as Operation,
    data: {
      addFilm: {
        title: 'title',
        id: 'id',
        __typename: '__typename',
      },
    },
  };

  const cache: Cache = {
    dependencies: {
      '__typename:id': [1, 2, 3],
      '__typename:id2': [0, 4],
    },
    triggers: {
      0: { value: 0 },
      1: { value: 0 },
      2: { value: 0 },
      3: { value: 0 },
      4: { value: 0 },
    },
  };

  const exchange = new QwikExchange(cache);

  exchange.processResponse(result);

  expect(cache.triggers[1]).toBe(undefined);
  expect(cache.triggers[2]).toBe(undefined);
  expect(cache.triggers[3]).toBe(undefined);
  expect(cache.dependencies['__typename:id']).toBe(undefined);
});
