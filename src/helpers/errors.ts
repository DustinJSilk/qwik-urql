import { CombinedError as UrqlCombinedError } from '@urql/core';
import { CombinedError } from '../types';

export const serializeError = (
  error?: UrqlCombinedError
): CombinedError | undefined => {
  return error
    ? {
        ...error,
        graphQLErrors: error.graphQLErrors.map((e) => e.toJSON()),
      }
    : undefined;
};
