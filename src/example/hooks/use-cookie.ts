import { useEnvData } from '@builder.io/qwik';
import { parse } from 'cookie';

export const useCookies = () => {
  const headers = useEnvData<Record<string, string>>('requestHeaders');

  if (!headers) {
    return {};
  }

  return parse(headers['cookie'] ?? '');
};

export const useCookie = (key: string): string | undefined => {
  const cookies = useCookies();
  return cookies[key];
};
