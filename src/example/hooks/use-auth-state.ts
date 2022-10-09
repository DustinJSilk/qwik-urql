import { useContext } from '@builder.io/qwik';
import { AuthStateContext } from '../contexts';

export const useAuthState = () => {
  return useContext(AuthStateContext);
};
