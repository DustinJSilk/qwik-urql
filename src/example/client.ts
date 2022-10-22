import { createClient, dedupExchange, makeOperation } from '@urql/core';
import { authExchange } from '@urql/exchange-auth';
import { executeExchange } from '@urql/exchange-execute';
import { cacheExchange } from '@urql/exchange-graphcache';
import { qwikExchange } from '../exchange/qwik-exchange';
import { ClientFactory, UrqlAuthTokens } from '../types';
import { rootValue, schema } from './api';

export const clientFactory: ClientFactory = ({ authTokens, qwikStore }) => {
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
    exchanges: [
      qwikExchange(qwikStore),
      dedupExchange,
      cacheExchange({
        optimistic: {
          updateFilm(args: { input: { id: string } }) {
            return {
              __typename: 'Film',
              id: args.input.id,
              title: '---- optimistic response ----',
            };
          },
        },
      }),
      auth,

      // Replace with fetchExchange for live requests
      executeExchange({ schema, rootValue }),
    ],
  });
};
