import { $ } from '@builder.io/qwik';
import { gql } from '@urql/core';
import { useMutation } from '../../../../hooks/use-mutation';

/**
 * This entire file should be auto generated for every query.
 * See https://www.the-guild.dev/graphql/codegen
 */

export type UpdateFilmMutationResponse = {
  updateFilm: {
    title: string;
    id: string;
  };
};

export type UpdateFilmInput = {
  id: string;
  title: string;
};

export type UpdateFilmMutationVars = {
  input: UpdateFilmInput;
};

export const query = gql<UpdateFilmMutationResponse, UpdateFilmMutationVars>`
  mutation UpdateFilm($input: UpdateFilmInput!) {
    updateFilm(input: $input) {
      title
      id
    }
  }
`;

export const UpdateFilmMutation = $(() => query);

export const useUpdateFilmMutation = () => {
  return useMutation(UpdateFilmMutation as any);
};
