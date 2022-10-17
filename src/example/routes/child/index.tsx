import {
  component$,
  useRef,
  useStore,
  useStylesScoped$,
} from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';
import { AddFilmResource } from './gql/add-film';
import { FilmResource } from './gql/film';
import { useUpdateFilmMutation } from './gql/update-film';

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
  const storeB = useStore({ input: { title: 'Newly added' } });
  const storeC = useStore({ input: { id: '0', title: 'Updated title' } });
  const titleRef = useRef();

  const { mutate$ } = useUpdateFilmMutation();

  return (
    <>
      <Link href={'/'}>Back home</Link>
      <br />
      <br />

      <ul>
        <li>
          <h3>Query</h3>
          Query film by ID and update when the cache updates:
          <input
            type="text"
            value={storeA.id}
            onKeyUp$={(ev) =>
              (storeA.id = (ev.target as HTMLInputElement).value)
            }
          />
          <br />
          <FilmResource
            vars={storeA}
            onPending$={() => <div>Loading...</div>}
            onRejected$={() => <div>Error</div>}
            onResolved$={(res) => {
              return <>{res.data ? res.data.film.title : 'No results'}</>;
            }}
          />
        </li>

        <li>
          <h3>Instant mutation</h3>
          This uses a resource and executes immediately. There is also a button
          to trigger more mutations. <br />
          Add film title to show ID:
          <input type="text" value={storeB.input.title} ref={titleRef} />
          <button
            onClick$={() =>
              (storeB.input = {
                title: (titleRef.current as HTMLInputElement).value,
              })
            }
          >
            Add
          </button>
          <br />
          <AddFilmResource
            vars={storeB}
            onPending$={() => <div>Loading...</div>}
            onRejected$={(reason) => <div>Error {reason}</div>}
            onResolved$={(res) => (
              <>{res.data ? res.data.addFilm.id : 'Failed'}</>
            )}
          />
        </li>

        <li>
          <h3>Execute mutation</h3>
          Update film 0's title:
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
