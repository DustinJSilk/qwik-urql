import {
  component$,
  createContext,
  QRL,
  Slot,
  useContextProvider,
  useStore,
} from '@builder.io/qwik';
import { ClientFactory, ClientFactoryStore, UrqlAuthTokens } from '../types';

export const UrqlQwikContext = createContext<{}>('urql-qwik-ctx');
export const UrqlAuthContext = createContext<UrqlAuthTokens>('urql-auth-ctx');
export const UrqlClientContext =
  createContext<ClientFactoryStore>('urql-client-ctx');

export type UrqlProviderProps = {
  auth?: UrqlAuthTokens;
  client: QRL<ClientFactory>;
};

export const UrqlProvider = component$((props: UrqlProviderProps) => {
  const clientFactoryStore = useStore({ factory: props.client });
  const qwikStore = useStore({});

  useContextProvider(UrqlQwikContext, qwikStore);
  useContextProvider(UrqlAuthContext, props.auth ?? {});
  useContextProvider(UrqlClientContext, clientFactoryStore);

  return <Slot />;
});
