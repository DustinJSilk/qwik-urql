import { $, component$, Resource, useStore } from '@builder.io/qwik';
import { createDOM } from '@builder.io/qwik/testing';
import { createClient, gql } from '@urql/core';
import { executeExchange } from '@urql/exchange-execute';
import graphql_ from 'graphql/index.js';
import { expect, test } from 'vitest';
import { UrqlProvider } from '../components/urql-provider';
import { useQuery } from './use-query';
const { buildSchema } = graphql_;

export const clientFactory = () => {
  return createClient({
    url: 'http://localhost:3000/graphql',
    exchanges: [
      executeExchange({
        schema: buildSchema(`
        type Film {
          id: String!
          title: String!
        }

        type Query {
          film(id: String!): Film
        }
      `),
        rootValue: {
          film: async ({ id }: { id: string }) => {
            return {
              title: 'Title',
              id,
            };
          },
        },
      }),
    ],
  });
};

export type FilmQueryResponse = {
  film: {
    id: string;
    title: string;
  };
};

export const FilmQuery = gql<FilmQueryResponse, { id: string }>`
  query Film($id: String!) {
    film(id: $id) {
      id
      title
    }
  }
`;

test(`[useQuery hook]: Should return query data`, async () => {
  const { screen, render } = await createDOM();

  const Child = component$(() => {
    const variables = useStore({ id: '1' });
    const query = useQuery(FilmQuery, variables);

    return (
      <Resource
        value={query}
        onResolved={(res) => {
          return <div>{res.data?.film.title}</div>;
        }}
      />
    );
  });

  await render(
    <UrqlProvider client={$(clientFactory)}>
      <Child />
    </UrqlProvider>
  );

  expect(screen.outerHTML).toContain('Title');
});
