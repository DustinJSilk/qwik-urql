import { isServer } from '@builder.io/qwik/build';
import { Client } from '@urql/core';
import { UrqlAuthTokens } from '../types';
import { newClient } from './client-factory';

export const getClient = async (ssrStore: {}, authToken?: UrqlAuthTokens) => {
  let client: Client | undefined = undefined;

  if (isServer || (!isServer && !(window as any).__urqlClient)) {
    client = await newClient(ssrStore, authToken);

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
