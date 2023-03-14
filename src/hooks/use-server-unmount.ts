import { implicit$FirstArg, QRL, useTask$ } from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';

export const useServerUnmountQrl = (fn: QRL<() => void>) => {
  useTask$(() => {
    if (isServer) {
      return fn;
    }
  });
};

export const useServerUnmount$ = implicit$FirstArg(useServerUnmountQrl);
