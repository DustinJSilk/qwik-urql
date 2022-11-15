import { $ } from '@builder.io/qwik';
import { createClient } from '@urql/core';
import { afterEach, expect, test, vi } from 'vitest';
import { clientCache } from './client-cache';

export const clientFactory = () => {
  return createClient({ url: 'http://localhost:3000/graphql' });
};

afterEach(() => {
  vi.restoreAllMocks();
});

test(`[ClientCache]: Should create a new client for each ID`, async () => {
  const [client1, client2] = await Promise.all([
    clientCache.getClient({
      factory: $(clientFactory),
      qwikStore: {} as any,
      id: 1,
    }),
    clientCache.getClient({
      factory: $(clientFactory),
      qwikStore: {} as any,
      id: 2,
    }),
  ]);

  expect(client1).not.toBe(client2);
});

test(`[ClientCache]: Should reuse clients for the same ID`, async () => {
  const [client1, client2] = await Promise.all([
    clientCache.getClient({
      factory: $(clientFactory),
      qwikStore: {} as any,
      id: 1,
    }),
    clientCache.getClient({
      factory: $(clientFactory),
      qwikStore: {} as any,
      id: 1,
    }),
  ]);

  expect(client1).toBe(client2);
});

test(`[ClientCache]: Should destroy clients with .gc()`, async () => {
  await Promise.all([
    clientCache.getClient({
      factory: $(clientFactory),
      qwikStore: {} as any,
      id: 1,
    }),
    clientCache.getClient({
      factory: $(clientFactory),
      qwikStore: {} as any,
      id: 2,
    }),
  ]);

  clientCache.gc(1);

  expect(clientCache).not.toHaveProperty('cache.1');
  expect(clientCache).toHaveProperty('cache.2');
});
