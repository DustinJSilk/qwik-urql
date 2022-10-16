import { QRL } from '@builder.io/qwik';
import { Client } from '@urql/core';

export type UrqlAuthTokens = { token?: string; refresh?: string };

/**
 * A factory for creating new Urql clients. It must accept a Qwik store that
 * can be used with the qwikExchange and an auth token which can be used by the
 * authExchange to pass a bearer token with requests
 */
export type ClientFactory = (props: {
  authTokens?: UrqlAuthTokens;
  qwikStore: {};
}) => Client;

export type ClientFactoryStore = { factory: QRL<ClientFactory> };
