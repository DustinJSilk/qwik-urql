import { QRL } from '@builder.io/qwik';
import { Client } from '@urql/core';
import { GraphQLFormattedError } from 'graphql';
import { Cache } from './exchange/qwik-exchange';

export type UrqlAuthTokens = { token?: string; refresh?: string };

export type UrqlOptions = {
  // Se the default watch behaviour.
  watch?: boolean;
};

/**
 * A factory for creating new Urql clients. It must accept a Qwik store that
 * can be used with the qwikExchange and an auth token which can be used by the
 * authExchange to pass a bearer token with requests
 */
export type ClientFactory = (props: {
  authTokens?: UrqlAuthTokens;
  qwikStore: Cache;
}) => Client;

export type ClientStore = {
  id: number;
  factory: QRL<ClientFactory>;
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
