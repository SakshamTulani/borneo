import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server';

// During SSR the Start server calls Fastify on the shopper's behalf, so it forwards their session
// cookie and passes any refreshed session cookie back to the browser (ADR-0008). The server-only
// imports are compiled out of the client bundle; http.ts only calls these when rendering on the server.

export const requestCookie = createIsomorphicFn()
  .server(() => getRequestHeader('cookie'))
  .client((): string | undefined => undefined);

export const passSetCookies = createIsomorphicFn()
  .server((cookies: string[]) => {
    if (cookies.length > 0) setResponseHeader('set-cookie', cookies);
  })
  .client((_cookies: string[]) => {});

/** A page rendered with the shopper's session must never sit in a shared cache. */
export const markPrivate = createIsomorphicFn()
  .server(() => setResponseHeader('cache-control', 'private, no-store'))
  .client(() => {});
