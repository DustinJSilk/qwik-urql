import { component$, JSXNode, Resource } from '@builder.io/qwik';
import { gql, OperationResult } from '@urql/core';
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

export const AddFilmMutation = gql`
  mutation AddFilm($input: AddFilmInput!) {
    addFilm(input: $input) {
      title
      id
    }
  }
`;

export const useAddFilmMutation = (vars: AddFilmMutationVars) => {
  return useMutationResource(AddFilmMutation, vars);
};

export type FilmResourceProps = {
  vars: AddFilmMutationVars;
  onResolved$: (
    value: OperationResult<AddFilmMutationResponse, AddFilmMutationVars>
  ) => JSXNode;
  onPending$?: () => JSXNode;
  onRejected$?: (reason: any) => JSXNode;
};

export const AddFilmResource = component$((props: FilmResourceProps) => {
  const vars = props.vars;
  const value = useAddFilmMutation(vars);

  return (
    <Resource
      value={value}
      onPending={props.onPending$}
      onRejected={props.onRejected$}
      onResolved={props.onResolved$}
    />
  );
});
