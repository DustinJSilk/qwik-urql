import {
  component$,
  createContext,
  QRL,
  Slot,
  useContextProvider,
  useStore,
} from '@builder.io/qwik';
import { nanoid } from 'nanoid';
import { type Cache } from '../exchange/qwik-exchange';
import { ClientFactory, ClientStore, UrqlAuthTokens } from '../types';

export const UrqlQwikContext = createContext<Cache>('urql-qwik-ctx');
export const UrqlAuthContext = createContext<UrqlAuthTokens>('urql-auth-ctx');
export const UrqlClientContext = createContext<ClientStore>('urql-client-ctx');

export type UrqlProviderProps = {
  auth?: UrqlAuthTokens;
  client: QRL<ClientFactory>;
};

export const UrqlProvider = component$((props: UrqlProviderProps) => {
  const clientStore = useStore<ClientStore>({
    factory: props.client,
    id: nanoid(),
  });
  const qwikStore = useStore<Cache>({
    queries: {},
    dependencies: {},
  });

  useContextProvider(UrqlQwikContext, qwikStore);
  useContextProvider(UrqlAuthContext, props.auth ?? {});
  useContextProvider(UrqlClientContext, clientStore);

  return <Slot />;
});
