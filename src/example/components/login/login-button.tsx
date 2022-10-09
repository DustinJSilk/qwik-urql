import { component$, useEnvData } from '@builder.io/qwik';
import { useAuthState } from '../../hooks/use-auth-state';
import { login } from './login';

export const LoginButton = component$(() => {
  const lang = useEnvData<string>('locale', 'en');
  const authState = useAuthState();

  return (
    <div>
      {authState.token ? (
        <>Logged in</>
      ) : (
        <button
          onClick$={async () => {
            const token = await login({ lang });
            authState.token = token;
          }}
        >
          Login
        </button>
      )}
    </div>
  );
});
