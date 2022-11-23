import { $ } from '@builder.io/qwik';
import { gql } from '@urql/core';
import { useMutationResource } from '../../../../hooks/use-mutation-resource';

/**
 * This entire file should be auto generated for every query.
 * See https://www.the-guild.dev/graphql/codegen
 */

export type AddFilmMutationResponse = {
  addFilm: {
    title: string;
    id: string;
  };
};

export type AddFilmInput = {
  title: string;
};

export type AddFilmMutationVars = {
  input: AddFilmInput;
};

export const query = gql<AddFilmMutationResponse, AddFilmMutationVars>`
  mutation AddFilm($input: AddFilmInput!) {
    addFilm(input: $input) {
      title
      id
    }
  }
`;

export const AddFilmMutation = $(() => query);

export const useAddFilmMutation = (vars: AddFilmMutationVars) => {
  return useMutationResource(AddFilmMutation, vars);
};
