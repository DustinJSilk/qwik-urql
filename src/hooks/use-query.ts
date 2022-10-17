import { useContext, useResource$, useSignal } from '@builder.io/qwik';
import {
  AnyVariables,
  OperationContext,
  OperationResult,
  TypedDocumentNode,
} from '@urql/core';
import { fetchWithAbort } from '../client/fetch-with-abort';
import { getClient } from '../client/get-client';
import {
  UrqlAuthContext,
  UrqlClientContext,
  UrqlQwikContext,
} from '../components/urql-provider';

export const useQuery = <Variables extends AnyVariables, Data = any>(
  query: TypedDocumentNode<Data, Variables> & {
    kind: string;
  },
  vars: Variables,
  context?: Partial<Omit<OperationContext, 'fetch'>> & { watch: boolean }
) => {
  const clientFactory = useContext(UrqlClientContext);
  const qwikStore = useContext(UrqlQwikContext);
  const tokens = useContext(UrqlAuthContext);

  const trigger = useSignal(0);

  return useResource$<OperationResult<Data, Variables>>(
    async ({ track, cleanup }) => {
      track(trigger);

      if (vars) {
        track(() => vars);
      }

      const client = await getClient(clientFactory, qwikStore, tokens);

      const abortCtrl = new AbortController();

      cleanup(() => abortCtrl.abort());

      const request = client.query<Data, Variables>(query, vars, {
        watch: true,
        ...context,
        fetch: fetchWithAbort(abortCtrl),
        trigger: trigger,
      });

      const res = await request.toPromise();

      // Remove non-serializable fields
      delete res.operation.context.fetch;

      return res;
    }
  );
};
