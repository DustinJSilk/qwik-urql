import { useContext, useResource$ } from '@builder.io/qwik';
import {
  AnyVariables,
  OperationContext,
  OperationResult,
  TypedDocumentNode,
} from '@urql/core';
import { fetchWithAbort } from '../client/fetch-with-abort';
import { getClient } from '../client/get-client';
import { UrqlAuthContext, UrqlCacheContext } from '../components/urql-provider';

export const useMutation = <Variables extends AnyVariables, Data = any>(
  query: TypedDocumentNode<Data, Variables> & {
    kind: string;
  },
  vars: Variables,
  context?: Partial<OperationContext>
) => {
  const initialCacheState = useContext(UrqlCacheContext);
  const tokens = useContext(UrqlAuthContext);

  return useResource$<OperationResult<Data, Variables>>(
    async ({ track, cleanup }) => {
      if (vars) {
        track(vars);
      }

      const client = await getClient(initialCacheState, tokens);

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
