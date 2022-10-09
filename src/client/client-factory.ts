import { QRL, useClientEffect$, useStore } from '@builder.io/qwik';
import { Client } from '@urql/core';
import { UrqlAuthTokens } from '../types';

/**
 * A factory for creating new Urql clients. It must accept a Qwik store that
 * can be used with the ssrExchange to resume state after SSR and an auth token
 * which can be used by the authExchange to pass a bearer token with requests
 */
export type ClientFactory = (
  ssrStore: {},
  authToken?: UrqlAuthTokens
) => Client;

let clientFactory: QRL<ClientFactory> | undefined;

/** ESLint complains without this function to store */
export const storeFactoryQRL = (factory: QRL<ClientFactory>) => {
  clientFactory = factory;
};

/** Registers a factory for creating new Urql clients */
export const registerClientFactory = (fn: QRL<ClientFactory>) => {
  const factory = useStore({ client: fn });

  storeFactoryQRL(factory.client);

  useClientEffect$(
    () => {
      storeFactoryQRL(factory.client);
    },
    { eagerness: 'load' }
  );
};

/**
 * Creates a new instance of Urql using the factory passed into
 * registerClientFactory
 */
export const newClient = (ssrStore: {}, authToken?: UrqlAuthTokens) => {
  if (!clientFactory) {
    throw new Error(
      'A ClientFactory has not been registered. Add ' +
        '`registerClientFactory($(() => createClient({ ... })) to root.tsx`'
    );
  }

  return clientFactory(ssrStore, authToken);
};
