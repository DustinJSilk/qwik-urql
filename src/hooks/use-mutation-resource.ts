import { useContext, useResource$ } from '@builder.io/qwik';
import {
  AnyVariables,
  OperationContext,
  OperationResult,
  TypedDocumentNode,
} from '@urql/core';
import { clientCache } from '../client/client-cache';
import { fetchWithAbort } from '../client/fetch-with-abort';
import {
  UrqlAuthContext,
  UrqlClientContext,
  UrqlQwikContext,
} from '../components/urql-provider';

export const useMutationResource = <Variables extends AnyVariables, Data = any>(
  query: TypedDocumentNode<Data, Variables> & {
    kind: string;
  },
  vars: Variables,
  context?: Partial<Omit<OperationContext, 'fetch'>>
) => {
  const clientStore = useContext(UrqlClientContext);
  const qwikStore = useContext(UrqlQwikContext);
  const tokens = useContext(UrqlAuthContext);

  return useResource$<OperationResult<Data, Variables>>(
    async ({ track, cleanup }) => {
      if (vars) {
        track(vars);
      }

      const client = await clientCache.getClient({
        factory: clientStore.factory,
        qwikStore,
        authTokens: tokens,
        id: clientStore.id,
      });

      const abortCtrl = new AbortController();
      cleanup(() => abortCtrl.abort());

      const res = await client
        .mutation<Data, Variables>(query, vars, {
          ...context,
          fetch: fetchWithAbort(abortCtrl),
        })
        .toPromise();

      delete res.operation.context.fetch;

      return res;
    }
  );
};
