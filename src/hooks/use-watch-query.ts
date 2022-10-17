import {
  useContext,
  useResource$,
  useSignal,
  useStore,
} from '@builder.io/qwik';
import { AnyVariables, OperationContext, TypedDocumentNode } from '@urql/core';
import { fetchWithAbort } from '../client/fetch-with-abort';
import { getClient } from '../client/get-client';
import {
  UrqlAuthContext,
  UrqlClientContext,
  UrqlQwikContext,
} from '../components/urql-provider';
import { serializeError } from '../helpers/errors';
import { WatchedOperationResult } from '../types';

export const useWatchQuery = <Variables extends AnyVariables, Data = any>(
  query: TypedDocumentNode<Data, Variables> & {
    kind: string;
  },
  vars: Variables,
  context?: Partial<Omit<OperationContext, 'fetch'>>
) => {
  const clientFactory = useContext(UrqlClientContext);
  const qwikStore = useContext(UrqlQwikContext);
  const tokens = useContext(UrqlAuthContext);

  const output = useStore<WatchedOperationResult<Data, Variables>>({} as any);

  const trigger = useSignal(0);

  return useResource$<WatchedOperationResult<Data, Variables>>(
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

      const result = await request.toPromise();

      // Remove non-serializable fields
      delete result.operation.context.fetch;

      // Update the store with the new response
      output.data = result.data;
      output.error = serializeError(result.error);
      output.extensions = result.extensions;
      output.hasNext = result.hasNext;
      output.stale = result.stale;

      return output;
    }
  );
};
