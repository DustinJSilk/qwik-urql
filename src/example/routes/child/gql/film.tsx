import { component$, JSXNode, Resource } from '@builder.io/qwik';
import { gql, OperationResult } from '@urql/core';
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

export const FilmQuery = gql`
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

export type FilmResourceProps = {
  vars: FilmQueryVars;
  onResolved$: (
    value: OperationResult<FilmQueryResponse, FilmQueryVars>
  ) => JSXNode;
  onPending$?: () => JSXNode;
  onRejected$?: (reason: any) => JSXNode;
};

export const FilmResource = component$((props: FilmResourceProps) => {
  const vars = props.vars;
  const value = useFilmQuery(vars);

  return (
    <Resource
      value={value}
      onPending={props.onPending$}
      onRejected={props.onRejected$}
      onResolved={props.onResolved$}
    />
  );
});
