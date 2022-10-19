import { QRL } from '@builder.io/qwik';
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
  private readonly cache: Record<number, ClientCacheEntry> = {};

  async getClient(args: {
    factory: QRL<ClientFactory>;
    qwikStore: Cache;
    authTokens?: UrqlAuthTokens;
    id: number;
  }) {
    const { factory, qwikStore, authTokens, id } = args;

    if (!this.has(id)) {
      this.set(id, factory({ authTokens, qwikStore }));
    }

    return this.get(id);
  }

  /** Removes references to a client to clean up after SSR */
  gc(id: number) {
    delete this.cache[id];
  }

  private set(id: number, factory: Promise<Client>) {
    this.cache[id] = {
      factory: toPromise(pipe(fromPromise(factory), share)),
      expires: Date.now() + 1000,
    };
  }

  private async get(id: number): Promise<Client> {
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

  private has(id: number): boolean {
    return this.cache[id] !== undefined;
  }
}

export const clientCache = new ClientCache();
