import { vi } from 'vitest';

type Reply = [status: number, body?: unknown];
type Handler = (body: unknown, url: URL) => Reply | Promise<Reply>;

/**
 * Stubs `fetch` for the browser API (`/api/...`). Keys are "METHOD /path" without the query
 * string; unknown calls fail the test loudly. Returns the mock to inspect calls.
 */
export function stubApi(routes: Record<string, Handler | Reply>) {
  const mock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    const key = `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api/, '')}`;
    const route = routes[key];
    if (!route) throw new Error(`Unexpected API call: ${key}`);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const [status, payload] = typeof route === 'function' ? await route(body, url) : route;
    return new Response(payload === undefined ? null : JSON.stringify(payload), { status });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** Bodies sent to "METHOD /path". */
export const sentTo = (mock: ReturnType<typeof stubApi>, key: string): unknown[] =>
  mock.mock.calls
    .filter(([input, init]) => {
      const url = new URL(input, 'http://localhost');
      return `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api/, '')}` === key;
    })
    .map(([, init]) => (init?.body ? JSON.parse(String(init.body)) : undefined));

export const apiError = (status: number, code: string, message: string): Reply => [
  status,
  { error: { code, message } },
];

export const customer = {
  id: 'c1',
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  emailVerified: false,
};
