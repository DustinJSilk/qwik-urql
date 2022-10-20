import {
  component$,
  Resource,
  useStore,
  useStylesScoped$,
} from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import { gql } from '@urql/core';
import { useMutation } from '../../hooks/use-mutation';
import { useQuery } from '../../hooks/use-query';

export const Query = gql`
  query Film($id: String!) {
    film(id: $id) {
      id
      title
    }
  }
`;

export const UpdateFilmMutation = gql`
  mutation UpdateFilm($input: UpdateFilmInput!) {
    updateFilm(input: $input) {
      title
      id
    }
  }
`;

export default component$(() => {
  useStylesScoped$(`
    ul {
      column-gap: 40px;
      display: flex;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      background-color: #eee;
      padding: 20px;
    }
  `);

  const storeA = useStore({ id: '0' });
  const storeC = useStore({ input: { id: '0', title: 'Updated value' } });

  const query = useQuery(Query, storeA);
  const { mutate$ } = useMutation(UpdateFilmMutation);

  return (
    <>
      <ul>
        <li>
          <h3>Subscription results</h3>
          Every button click should update the UI twice, but it only updates
          once.
          <Resource
            value={query}
            onResolved={(res) => {
              return <h4>{res.data ? res.data.film.title : 'No results'}</h4>;
            }}
          />
        </li>

        <li>
          <h3>Trigger subscription</h3>
          <input
            type="text"
            value={storeC.input.title}
            onKeyUp$={(ev) =>
              (storeC.input.title = (ev.target as HTMLInputElement).value)
            }
          />
          <button
            onClick$={async () => {
              await mutate$(storeC);
            }}
          >
            Update
          </button>
          <br />
          {/* Loading: {loading.value ? 'true' : 'false'} */}
          <br />
        </li>
      </ul>
    </>
  );
});

export const head: DocumentHead = {
  title: 'First page',
};
