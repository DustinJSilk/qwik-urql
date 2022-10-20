import { implicit$FirstArg, QRL, useWatch$ } from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';

export const useServerUnmountQrl = (fn: QRL<() => void>) => {
  useWatch$(() => {
    if (isServer) {
      return fn;
    }
  });
};

export const useServerUnmount$ = implicit$FirstArg(useServerUnmountQrl);
