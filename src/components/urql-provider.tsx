import {
  component$,
  createContext,
  QRL,
  Slot,
  useContextProvider,
  useStore,
} from '@builder.io/qwik';
import { ClientFactory, ClientFactoryStore, UrqlAuthTokens } from '../types';

export const UrqlCacheContext = createContext<{}>('urql-cache-ctx');
export const UrqlAuthContext = createContext<UrqlAuthTokens>('urql-auth-ctx');
export const UrqlClientContext =
  createContext<ClientFactoryStore>('urql-client-ctx');

export type UrqlProviderProps = {
  auth?: UrqlAuthTokens;
  client: QRL<ClientFactory>;
};

export const UrqlProvider = component$((props: UrqlProviderProps) => {
  const cacheStore = useStore({});
  const factoryStore = useStore({ factory: props.client });

  useContextProvider(UrqlCacheContext, cacheStore);
  useContextProvider(UrqlAuthContext, props.auth ?? {});
  useContextProvider(UrqlClientContext, factoryStore);

  return <Slot />;
});
