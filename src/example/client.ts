import { isServer } from '@builder.io/qwik/build';
import {
  createClient,
  dedupExchange,
  fetchExchange,
  makeOperation,
} from '@urql/core';
import { authExchange } from '@urql/exchange-auth';
import { cacheExchange } from '@urql/exchange-graphcache';
import { UrqlAuthTokens } from '../types';
import { ssrExchange } from './ssr-exchange';

export const clientFactory = (ssrStore: {}, authTokens?: UrqlAuthTokens) => {
  const ssr = ssrExchange({
    isClient: !isServer,
    initialState: isServer ? undefined : ssrStore,
    store: ssrStore,
  });

  const auth = authExchange<UrqlAuthTokens>({
    getAuth: async ({ authState }) => {
      if (!authState) {
        if (authTokens) {
          return authTokens;
        }

        return null;
      }

      return null;
    },
    willAuthError: ({ authState }) => {
      if (!authState) return true;
      return false;
    },
    addAuthToOperation: ({ authState, operation }) => {
      if (!authState || !authState.token) {
        return operation;
      }

      const fetchOptions =
        typeof operation.context.fetchOptions === 'function'
          ? operation.context.fetchOptions()
          : operation.context.fetchOptions || {};

      return makeOperation(operation.kind, operation, {
        ...operation.context,
        fetchOptions: {
          ...fetchOptions,
          headers: {
            ...fetchOptions.headers,
            Authorization: authState.token,
          },
        },
      });
    },
    didAuthError: ({ error }) => {
      return error.graphQLErrors.some(
        (e) => e.extensions?.code === 'FORBIDDEN'
      );
    },
  });

  return createClient({
    url: 'http://localhost:3000/graphql',
    exchanges: [dedupExchange, cacheExchange({}), ssr, auth, fetchExchange],
  });
};
