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
        type Director {
          id: String!
          favouriteFilm: Film!
          worstFilm: Film!
        }

        type Film {
          id: String!
          title: String!
        }

        type Query {
          film(id: String!): Film
          director(id: String!): Director
        }
      `),
        rootValue: {
          film: async ({ id }: { id: string }) => {
            return {
              title: 'Title',
              id,
            };
          },
          director: async ({ id }: { id: string }) => {
            return {
              favouriteFilm: { id: '1', title: 'Favourite Film' },
              worstFilm: { id: '2', title: 'Worst Film' },
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

export type DirectorQueryResponse = {
  director: {
    id: string;
    favouriteFilm: { id: string; title: string };
    worstFilm: { id: string; title: string };
  };
};

export const DirectorQuery = gql<DirectorQueryResponse, { id: string }>`
  query director($id: String!) {
    director(id: $id) {
      id
      favouriteFilm {
        id
        title
      }
      worstFilm {
        id
        title
      }
    }
  }
`;

test(`[useQuery hook]: Should return nested data`, async () => {
  const { screen, render } = await createDOM();

  const Child = component$(() => {
    const variables = useStore({ id: '1' });
    const query = useQuery(DirectorQuery, variables);

    return (
      <Resource
        value={query}
        onResolved={(res) => {
          return (
            <div>
              {res.data?.director.favouriteFilm.title}
              {res.data?.director.worstFilm.title}
            </div>
          );
        }}
      />
    );
  });

  await render(
    <UrqlProvider client={$(clientFactory)}>
      <Child />
    </UrqlProvider>
  );

  expect(screen.outerHTML).toContain('Favourite Film');
  expect(screen.outerHTML).toContain('Worst Film');
});
