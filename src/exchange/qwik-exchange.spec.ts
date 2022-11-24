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
