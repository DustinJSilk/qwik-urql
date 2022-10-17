import {
  useContext,
  useResource$,
  useSignal,
  useStore,
} from '@builder.io/qwik';
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

export const useWatchQuery = <Variables extends AnyVariables, Data = any>(
  query: TypedDocumentNode<Data, Variables> & {
    kind: string;
  },
  vars: Variables,
  context?: Partial<OperationContext>
) => {
  const clientFactory = useContext(UrqlClientContext);
  const qwikStore = useContext(UrqlQwikContext);
  const tokens = useContext(UrqlAuthContext);

  const output = useStore<OperationResult<Data, Variables>>({} as any);

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
        ...context,
        fetch: fetchWithAbort(abortCtrl),
        store: output,
        watch: true,
        trigger: trigger,
      });

      await request.toPromise();

      return output;
    }
  );
};
