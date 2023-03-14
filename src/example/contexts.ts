import { createContextId } from '@builder.io/qwik';

export const AuthStateContext = createContextId<{ token: string }>(
  'auth-state'
);
