import { createContext } from '@builder.io/qwik';

export const AuthStateContext = createContext<{ token: string }>('auth-state');
