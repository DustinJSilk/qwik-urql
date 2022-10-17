import { component$ } from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';
import { LoginButton } from '../components/login/login-button';

export default component$(() => {
  return (
    <div>
      Home page
      <br />
      <Link href="/child">Go to page with request</Link>
      <br />
      <br />
      <LoginButton />
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Home',
};
