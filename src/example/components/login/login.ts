export const login = async ({ lang }: { lang?: string }) => {
  // Add your authentication logic. For example, with firebase you'd do:
  //
  // const app = initializeApp({});
  // const auth = getAuth(app);
  // auth.languageCode = lang ?? 'en';
  // const provider = new GoogleAuthProvider();
  // const result = await signInWithPopup(auth, provider);
  // const token = await result.user.getIdToken();

  const token = 'my-fake-token';

  // Post the token to the Qwik server so that the server can return a
  // Set-Cookie header
  await fetch('/auth', {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ token }),
  });

  return token;
};
