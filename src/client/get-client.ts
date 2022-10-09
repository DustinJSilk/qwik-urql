import { isServer } from '@builder.io/qwik/build';
import { Client } from '@urql/core';
import { ClientFactoryStore, UrqlAuthTokens } from '../types';

export const getClient = async (
  factory: ClientFactoryStore,
  ssrStore: {},
  authToken?: UrqlAuthTokens
) => {
  let client: Client | undefined = undefined;

  if (isServer || (!isServer && !(window as any).__urqlClient)) {
    client = await factory.factory(ssrStore, authToken);

    if (!isServer) {
      (window as any).__urqlClient = client;
    }
  } else if (!isServer && (window as any).__urqlClient) {
    client = (window as any).__urqlClient;
  }

  if (!client) {
    throw new Error('Unable to find Urql client');
  }

  return client;
};
