import {
  component$,
  createContext,
  QRL,
  Slot,
  useContextProvider,
  useStore,
} from '@builder.io/qwik';
import { clientCache } from '../client/client-cache';
import { type Cache } from '../exchange/qwik-exchange';
import { useServerUnmount$ } from '../hooks/use-server-unmount';
import { ClientFactory, ClientStore, UrqlAuthTokens } from '../types';

export const UrqlQwikContext = createContext<Cache>('urql-qwik-ctx');
export const UrqlAuthContext = createContext<UrqlAuthTokens>('urql-auth-ctx');
export const UrqlClientContext = createContext<ClientStore>('urql-client-ctx');

export type UrqlProviderProps = {
  auth?: UrqlAuthTokens;
  client: QRL<ClientFactory>;
};

export const idCounter = {
  current: 0,
};

export const UrqlProvider = component$((props: UrqlProviderProps) => {
  const id = idCounter.current++;

  const clientStore = useStore<ClientStore>({
    factory: props.client,
    id: id,
  });

  const qwikStore = useStore<Cache>({
    triggers: {},
    dependencies: {},
  });

  useContextProvider(UrqlQwikContext, qwikStore);
  useContextProvider(UrqlAuthContext, props.auth ?? {});
  useContextProvider(UrqlClientContext, clientStore);

  // Remove the Urql client when the page is finished rendering
  useServerUnmount$(() => clientCache.gc(id));

  return <Slot />;
});
