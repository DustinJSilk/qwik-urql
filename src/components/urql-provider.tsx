import {
  component$,
  createContext,
  Slot,
  useContextProvider,
  useStore,
} from '@builder.io/qwik';
import { UrqlAuthTokens } from '../types';

export const UrqlCacheContext = createContext<{}>('urql-cache-context');
export const UrqlAuthContext =
  createContext<UrqlAuthTokens>('urql-auth-context');

export type UrqlProviderProps = {
  auth?: UrqlAuthTokens;
};

export const UrqlProvider = component$((props: UrqlProviderProps) => {
  const cacheStore = useStore({});

  useContextProvider(UrqlCacheContext, cacheStore);
  useContextProvider(UrqlAuthContext, props.auth ?? {});

  return <Slot />;
});
