import { QRL } from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';
import { Client } from '@urql/core';
import { fromPromise, pipe, share, toPromise } from 'wonka';
import { Cache } from '../exchange/qwik-exchange';
import { ClientFactory, UrqlAuthTokens } from '../types';

type ClientCacheEntry = {
  factory?: Promise<Client>;
  client?: Client;
  expires: number;
};

/**
 * Stores an instance of the Urql client against a unique ID so that server
 * requests can reuse the same instance for each render.
 * The client is stored on the Window on the client.
 */
class ClientCache {
  private readonly cache: Record<string, ClientCacheEntry> = {};

  constructor() {
    // Remove clients older than 1 second every second
    if (isServer) {
      setInterval(() => {
        const keys = Object.keys(this.cache);
        for (const key of keys) {
          if (Date.now() < this.cache[key].expires) {
            delete this.cache[key];
          }
        }
      }, 1000);
    }
  }

  set(id: string, factory: Promise<Client>) {
    this.cache[id] = {
      factory: toPromise(pipe(fromPromise(factory), share)),
      expires: Date.now() + 1000,
    };
  }

  async get(id: string): Promise<Client> {
    const store = this.cache[id];

    if (!store.client) {
      if (!store.factory) {
        throw new Error('Client factory not found');
      }

      store.client = await store.factory;
      delete store.factory;
    }

    return store.client!;
  }

  has(id: string): boolean {
    return this.cache[id] !== undefined;
  }
}

const clientCache = new ClientCache();

export const getClient = async (args: {
  factory: QRL<ClientFactory>;
  qwikStore: Cache;
  authTokens?: UrqlAuthTokens;
  id: string;
}) => {
  const { factory, qwikStore, authTokens, id } = args;

  if (!clientCache.has(id)) {
    clientCache.set(id, factory({ authTokens, qwikStore }));
  }

  return clientCache.get(id);
};
