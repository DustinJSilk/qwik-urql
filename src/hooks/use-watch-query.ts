import { useContext, useResource$, useStore } from '@builder.io/qwik';
import {
  AnyVariables,
  OperationContext,
  OperationResult,
  TypedDocumentNode,
} from '@urql/core';
import { pipe, subscribe } from 'wonka';
import { fetchWithAbort } from '../client/fetch-with-abort';
import { getClient } from '../client/get-client';
import {
  UrqlAuthContext,
  UrqlClientContext,
  UrqlQwikContext,
  UrqlSsrContext,
} from '../components/urql-provider';

export const useWatchQuery = <Variables extends AnyVariables, Data = any>(
  query: TypedDocumentNode<Data, Variables> & {
    kind: string;
  },
  vars: Variables,
  context?: Partial<OperationContext>
) => {
  const clientFactory = useContext(UrqlClientContext);
  const ssrStore = useContext(UrqlSsrContext);
  const qwikStore = useContext(UrqlQwikContext);
  const tokens = useContext(UrqlAuthContext);

  const output = useStore<OperationResult<Data, Variables>>({} as any, {
    recursive: true,
  });

  return useResource$<OperationResult<Data, Variables>>(
    async ({ track, cleanup }) => {
      if (vars) {
        track(vars);
      }

      const client = await getClient(
        clientFactory,
        ssrStore,
        qwikStore,
        tokens
      );

      const abortCtrl = new AbortController();

      const request = client.query<Data, Variables>(query, vars, {
        ...context,
        fetch: fetchWithAbort(abortCtrl),
        store: output,
        resume: true,
      });

      return new Promise((resolve, reject) => {
        // A subscription keeps the query alive but the store is updated in
        // the qwikExchange
        const { unsubscribe } = pipe(
          request,
          subscribe((result) => {
            resolve(output);
          })
        );

        cleanup(() => {
          abortCtrl.abort();
          unsubscribe();
        });
      });
    }
  );
};
