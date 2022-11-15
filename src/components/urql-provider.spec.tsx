import { $ } from '@builder.io/qwik';
import { createDOM } from '@builder.io/qwik/testing';
import { createClient } from '@urql/core';
import { expect, test } from 'vitest';
import { UrqlProvider } from './urql-provider';

export const clientFactory = () => {
  return createClient({ url: 'http://localhost:3000/graphql' });
};

test(`[UrqlProvider Component]: Should render child`, async () => {
  const { screen, render } = await createDOM();
  await render(
    <UrqlProvider client={$(clientFactory)}>
      <div>Success</div>
    </UrqlProvider>
  );
  expect(screen.outerHTML).toContain('Success');
});
