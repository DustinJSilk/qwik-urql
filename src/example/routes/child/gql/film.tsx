import { $ } from '@builder.io/qwik';
import { gql } from '@urql/core';
import { useQuery } from '../../../../hooks/use-query';

/**
 * This entire file should be auto generated for every query.
 * See https://www.the-guild.dev/graphql/codegen
 */

export type FilmQueryResponse = {
  film: {
    title: string;
    id: string;
    subTitle?: string;
  };
};

export type FilmQueryVars = {
  id: string;
};

export const query = gql<FilmQueryResponse, { id: string }>`
  query Film($id: String!) {
    film(id: $id) {
      id
      title
      subTitle
    }
  }
`;

export const FilmQuery = $(() => query);

export const useFilmQuery = (vars: FilmQueryVars) => {
  return useQuery(FilmQuery, vars);
};
