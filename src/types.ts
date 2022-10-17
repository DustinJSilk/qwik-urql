import { QRL } from '@builder.io/qwik';
import { AnyVariables, Client, OperationResult } from '@urql/core';
import { GraphQLFormattedError } from 'graphql';
import { DeepOmit } from 'ts-essentials';
import { Cache } from './exchange/qwik-exchange';

export type UrqlAuthTokens = { token?: string; refresh?: string };

/**
 * A factory for creating new Urql clients. It must accept a Qwik store that
 * can be used with the qwikExchange and an auth token which can be used by the
 * authExchange to pass a bearer token with requests
 */
export type ClientFactory = (props: {
  authTokens?: UrqlAuthTokens;
  qwikStore: Cache;
}) => Client;

export type ClientFactoryStore = { factory: QRL<ClientFactory> };

/** A Urql OperationResult omitting any non-serializable fields */
export type WatchedOperationResult<
  Data,
  Variables extends AnyVariables
> = DeepOmit<
  OperationResult<Data, Variables>,
  { operation: never; error: never }
> & {
  error?: CombinedError;
};

/** Urql errors in a serializable format */
export type CombinedError = {
  name: string;
  message: string;
  graphQLErrors: GraphQLFormattedError[];
  networkError?: {
    name: string;
    message: string;
    stack?: string;
  };
  response?: any;
};
