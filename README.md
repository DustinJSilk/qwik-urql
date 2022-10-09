# Qwik Urql ⚡️

A small library to use Urql with Qwik.

- :chart: Query & mutation hooks
- :chart: SSR state shared to the frontend client
- :chart: Lazy loaded client (A tiny file still loads on startup)
- :chart: Auth tokens
- :chart: Abort signals
- :hourglass: Reactive cache / watch for changes
- :hourglass: Optimistic response
- :hourglass: Code generators
- :hourglass: Re-execute queries

## Setup

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

Now register the client in your root.tsx component and wrap the client in a QRL to ensure it is lazy loaded.

```TypeScript
import { $, component$ } from '@builder.io/qwik';
import { registerClientFactory } from 'qwik-urql';
import { clientFactory } from './client';

export default component$(() => {
  registerClientFactory($(clientFactory));

  return /** Your app */;
});
```

## Queries

First compile the GQL and then call `useQuery`. The result is a Qwik
ResourceResource which can be used with the `<Resource />` component.

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
  const query = useQuery(Query, vars);

  return <Resource
    value={query}
    onPending={...}
    onRejected={...}
    onResolved={...}
  />
})
```

## Mutations

Mutations work the exact same as queries but use the `useMutation` hook.

## SSR

Urql natively supports SSR and rehydrating server side state on the frontend.

To make this work with Qwik we need the `ssrExchange` to support using a Qwik store to make resumability easier.

I've made some edits to the Urql ssrExchange, [use this ssrExchange](https://gist.github.com/DustinJSilk/917da8dda2b72826b8e677513d3abcb3) until I can get a PR in (or if resumability comes with a cache store later)

Update your `client.ts` file to contain the following:

```TypeScript
import { isServer } from '@builder.io/qwik/build';
import { createClient } from '@urql/core';

// Save and import the file linked above
import { ssrExchange } from './ssr-exchange';

export const clientFactory = (ssrStore: {}) => {
  const ssr = ssrExchange({
    isClient: !isServer,
    initialState: isServer ? undefined : ssrStore,
    store: ssrStore,
  });

  return createClient({
    url: 'http://localhost:3000/graphql',
    exchanges: [dedupExchange, cacheExchange({}), ssr, fetchExchange],
  });
};
```

You then need to add the `UrqlProvider` to your app so that the ssrStore can
be injected into your client ssrExchange:

```TypeScript
import { UrqlProvider } from 'qwik-urql';

export default component$(() => {
  registerClientFactory($(clientFactory));

  return (
    <UrqlProvider>
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

## Authentication

_Make sure you follow the latest recommendations by Urql._

First update your clientFactory to include the Urql auth exchange. Notice the
factory now accepts an authTokens parameter which can be used when making your
requests.

```TypeScript
export const clientFactory = (ssrStore: {}, authTokens?: UrqlAuthTokens) => {
  const ssr = ssrExchange({
    isClient: !isServer,
    initialState: isServer ? undefined : ssrStore,
    store: ssrStore,
  });

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
    exchanges: [dedupExchange, cacheExchange({}), ssr, auth, fetchExchange],
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
  // Register your client factory
  registerClientFactory($(clientFactory));

  // Get access to your authentication tokens
  const session = useCookie('session');

  // Add them to a store
  const authState = useStore({ token: session  });

  return (
    // Provide them to your entire app
    <UrqlProvider auth={authState}>
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
