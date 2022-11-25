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

test(`[QwikExchange]: Should set dependencies`, async () => {
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
