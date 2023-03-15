import { RequestHandler } from '@builder.io/qwik-city';

export const onPost: RequestHandler<string> = async ({
  request,
  headers,
  json,
}) => {
  const body = await request.json();

  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  // Some logic to turn the token into a cookie
  const cookie = Buffer.from(body.token).toString('base64');

  headers.append(
    'Set-Cookie',
    `session=${cookie}; maxAge=${expiresIn}; httpOnly; Secure; SameSite=Strict`
  );

  json(200, { success: true });
};
