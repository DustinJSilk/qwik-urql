# Qwik Urql ⚡️

A small library to use Urql with Qwik.

- :white_check_mark: Query & mutation hooks
- :white_check_mark: SSR
- :white_check_mark: Lazy loaded client
- :white_check_mark: Auth tokens
- :white_check_mark: Abort signals
- :white_check_mark: Re-execute queries (see example app buttons)
- :white_check_mark: Reactive cache / watch for changes
- :hourglass: Optimistic response (This requires a reactive cache)
- :hourglass: Code generators

## Setup

This is the minimal setup required for standard Query/Mutations. [See the reactive cache section for watch queries](#reactive-cache)

Create a new file to hold your Urql client configuration under `src/client.ts` and export a factory for your client.

```TypeScript
import { createClient } from '@urql/core';

export const clientFactory = () => {
  return createClient({
    url: 'http://localhost:3000/graphql',
    exchanges: [/** ... */],
  });
};
```

Now provide the client in your root.tsx component and wrap the client in a QRL to ensure it is lazy loaded.

```TypeScript
import { $, component$ } from '@builder.io/qwik';
import { clientFactory } from './client';

export default component$(() => {
  return (
    <UrqlProvider client={$(clientFactory)}>
      <QwikCity>
        <head></head>
        <body lang='en'>
          ...
        </body>
      </QwikCity>
    </UrqlProvider>
  );
});
```

## Queries

First compile the GQL and then call `useQuery`. The result is a Qwik
ResourceReturn which can be used with the `<Resource />` component.

```TypeScript
import { component$, JSXNode, Resource } from '@builder.io/qwik';
import { gql, OperationResult } from '@urql/core';
import { useQuery } from 'qwik-urql';

// Create
export const Query = gql`
  query Item($id: String!) {
    item(id: $id) {
      id
      title
    }
  }
`;

export default component$(() => {
  const vars = useStore({ id: '...' })
  const query = useQuery(Query, vars, { requestPolicy: 'network-only' });

  return <Resource
    value={query}
    onPending={...}
    onRejected={...}
    onResolved={...}
  />
})
```

## Mutations

There are 2 hooks for running a mutation.

- The `useMutationResource` works the exact same as `useQuery`. It will trigger
  as soon as the component loads. You can then re-trigger it by changing the
  input store.
- The `useMutation` returns a store that includes the `data`, `errors`,
  `loading` state, and a method to execute the mutation `mutate$`. This allows
  you to delay the execution of the request until a user interaction happens.

```TypeScript
export const Mutation = gql`
  mutation UpdateItem($id: String!, $title: String!) {
    item(id: $id, title: $title) {
      id
      title
    }
  }
`;

export default component$(() => {
  // You can pass in variables during initialisation or execution
  const initialVars = useStore({ id: '...' })
  const { data, errors, loading, mutate$ } = useMutation(Mutation, initialVars);

  return <>
    { loading ? 'loading' : 'done' }
    <button onClick$={() => mutate$({ title: '...' })}>Mutate</button>
  </>
})
```

## SSR

Qwik doesn't hydrate on the client after SSR. This means we don't need to
support the SSR exchange, everything works without it.

## Reactive cache

Qwik doesn't natively support resumable subscriptions because they arent
naturally serializable. To make subscriptions work, I've written a new Urql
exchange that doesn't rely on Wonka subscriptions, but rather uses Qwik signals
to trigger cach-only refetches. This means subscriptions can start on the server
and continue on the frontend.

To set this up, add the `qwikExchange` to your client and make sure it is before
the cache exchange.

```TypeScript
import { createClient, dedupExchange, fetchExchange } from '@urql/core';
import { cacheExchange } from '@urql/exchange-graphcache';
import { qwikExchange, ClientFactory } from 'qwik-urql';

export const clientFactory: ClientFactory = ({ qwikStore }) => {
  return createClient({
    url: 'http://localhost:3000/graphql',
    exchanges: [
      qwikExchange(qwikStore),
      dedupExchange,
      cacheExchange({}),
      fetchExchange,
    ],
  });
};
```

## Authentication

_Make sure you follow the latest recommendations by Urql._

First update your clientFactory to include the Urql auth exchange. Notice the
factory now accepts an authTokens parameter which can be used when making your
requests.

```TypeScript
export const clientFactory: ClientFactory = ({ authTokens }) => {
  const auth = authExchange<UrqlAuthTokens>({
    getAuth: async ({ authState }) => {
      if (!authState) {
        if (authTokens) {
          return authTokens;
        }

        return null;
      }

      return null;
    },
    willAuthError: ({ authState }) => {
      if (!authState) return true;
      return false;
    },
    addAuthToOperation: ({ authState, operation }) => {
      if (!authState || !authState.token) {
        return operation;
      }

      const fetchOptions =
        typeof operation.context.fetchOptions === 'function'
          ? operation.context.fetchOptions()
          : operation.context.fetchOptions || {};

      return makeOperation(operation.kind, operation, {
        ...operation.context,
        fetchOptions: {
          ...fetchOptions,
          headers: {
            ...fetchOptions.headers,
            Authorization: authState.token,
          },
        },
      });
    },
    didAuthError: ({ error }) => {
      return error.graphQLErrors.some(
        (e) => e.extensions?.code === 'FORBIDDEN'
      );
    },
  });

  return createClient({
    url: 'http://localhost:3000/graphql',
    exchanges: [dedupExchange, cacheExchange({}), auth, fetchExchange],
  });
};
```

Authentication has to use cookies to allow authenticated SSR. To do this, you
will need to set a cookie after your user has logged in. This cookie then
needs to be read from the request headers and saved to a Qwik store. (I'll
include an example of this with firebase soon)

To inject your auth tokens into the clientFactory, you need to provide them in
your `root.tsx`:

```TypeScript
import { UrqlProvider } from 'qwik-urql';

export default component$(() => {
  // Get access to your authentication tokens
  const session = useCookie('session');

  // Add them to a store
  const authState = useStore({ token: session  });

  return (
    // Provide them to your entire app
    <UrqlProvider auth={authState} client={$(clientFactory)}>
      <QwikCity>
        <head>
          <meta charSet='utf-8' />
          <RouterHead />
        </head>
        <body lang='en'>
          <RouterOutlet />
          <ServiceWorkerRegister />
        </body>
      </QwikCity>
    </UrqlProvider>
  );
});
```

You should now receive auth tokens in your GQL server from both the frontend
client and from SSR clients.

## Code generation

#### **Coming soon.**

I plan to create a code generate to convert `.graphql` files like this:

```GraphQL
query Film($id: String!) {
  film(id: $id) {
    id
    title
  }
}
```

Into something like this:

```TypeScript
import { component$, JSXNode, Resource } from '@builder.io/qwik';
import { gql, OperationResult } from '@urql/core';
import { useQuery } from 'qwik-urql';

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
```

And then in your component all you need to import is this:

```TypeScript
const vars = useStore({ id: '0' });

return <FilmResource
  vars={vars}
  onPending$={() => <div>Loading...</div>}
  onRejected$={() => <div>Error</div>}
  onResolved$={(res) => (
    <>{res.data ? res.data.film.title : 'No results'}</>
  )}
/>
```

## Example app

**The example requires [this PR](https://github.com/BuilderIO/qwik/pull/1594) for authentication to work. To test
authentication you will need to build it yourself and update your node_modules
until it is merged**

An example app is included in the repository.
The source code is found in `src/example`

Run the mock GraphQL server with

`yarn api`

Then run the Qwik City app with

`yarn start`

## Development

Development mode uses [Vite's development server](https://vitejs.dev/). For Qwik during development, the `dev` command will also server-side render (SSR) the output. The client-side development modules loaded by the browser.

```
npm run dev
```

> Note: during dev mode, Vite will request many JS files, which does not represent a Qwik production build.

## Production

The production build should generate the production build of your component library in (./lib) and the typescript type definitions in (./lib-types).

```
npm run build
```
