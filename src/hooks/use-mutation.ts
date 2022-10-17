import {
  $,
  QRL,
  Signal,
  useContext,
  useSignal,
  useStore,
  useWatch$,
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
import { CombinedError } from '../types';

/**
 * The mutate function needs to be a QRL
 * We're trying to make it callable without a resource
 */
export type MutationResult<Variables extends AnyVariables, Data = any> = {
  loading: Signal<boolean>;
  data?: Data;
  error?: CombinedError;
  mutate$: QRL<(vars: Variables) => void>;
};

export const useMutation = <Variables extends AnyVariables, Data = any>(
  query: TypedDocumentNode<Data, Variables> & {
    kind: string;
  },
  initialVars?: Partial<Variables>,
  context?: Partial<Omit<OperationContext, 'fetch'>>
): MutationResult<Variables, Data> => {
  const clientFactory = useContext(UrqlClientContext);
  const qwikStore = useContext(UrqlQwikContext);
  const tokens = useContext(UrqlAuthContext);

  const vars = useStore({ value: initialVars as Variables });
  const trigger = useStore({ i: 0 });
  const loadingSignal = useSignal(false);

  const results = useStore<MutationResult<Variables, Data>>({
    loading: loadingSignal,
    data: undefined,
    error: undefined,
    mutate$: $((input: Variables) => {
      vars.value = {
        ...vars.value,
        ...input,
      };

      loadingSignal.value = true;

      trigger.i++;
    }),
  });

  useWatch$(async ({ track, cleanup }) => {
    if (vars) {
      track(vars);
    }

    if (trigger.i === 0) {
      return;
    }

    const client = await getClient(clientFactory, qwikStore, tokens);

    const abortCtrl = new AbortController();
    cleanup(() => abortCtrl.abort());

    const res = await client
      .mutation<Data, Variables>(query, vars.value, {
        ...context,
        fetch: fetchWithAbort(abortCtrl),
      })
      .toPromise();

    loadingSignal.value = false;
    results.data = res.data;

    results.error = serializeError(res.error);
  });

  return results;
};
