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
  };
};

export type FilmQueryVars = {
  id: string;
};

// TODO: Constants get serialized into the HTML and should rather be lazy loaded
export const FilmQuery = gql<FilmQueryResponse, { id: string }>`
  query Film($id: String!) {
    film(id: $id) {
      id
      title
    }
  }
`;

export const useFilmQuery = (vars: FilmQueryVars) => {
  return useQuery(FilmQuery, vars);
};
