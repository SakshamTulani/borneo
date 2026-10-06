import { errorResponseSchema } from '@borneo/shared';
import type { z } from 'zod';
import { markPrivate, passSetCookies, requestCookie } from './ssrRequest';

// SSR fetches Fastify directly; the browser goes through the /api proxy (ADR-0008).
const baseUrl = import.meta.env.SSR ? (process.env.API_URL ?? 'http://localhost:3000') : '/api';

/** A failed API call with the API's stable error code (api-design.md). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const isApiError = (e: unknown, status?: number): e is ApiError =>
  e instanceof ApiError && (status === undefined || e.status === status);

async function request(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (import.meta.env.SSR) {
    const cookie = requestCookie();
    if (cookie) {
      headers.cookie = cookie;
      markPrivate();
    }
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (import.meta.env.SSR) passSetCookies(res.headers.getSetCookie());
  if (!res.ok) {
    const parsed = errorResponseSchema.safeParse(await res.json().catch(() => null));
    throw parsed.success
      ? new ApiError(
          res.status,
          parsed.data.error.code,
          parsed.data.error.message,
          parsed.data.error.details,
        )
      : new ApiError(res.status, 'HTTP_ERROR', `${method} ${path} failed: ${res.status}`);
  }
  return res;
}

/** GET + Zod parse. Only feature `api/` folders call this. */
export async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(await (await request('GET', path)).json());
}

/** A write with a JSON answer (body optional). Only feature `api/` folders call this. */
export async function sendJson<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  return schema.parse(await (await request(method, path, body)).json());
}

/** A write whose answer has no body (204). Only feature `api/` folders call this. */
export async function send(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
  await request(method, path, body);
}
