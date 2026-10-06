import { errorResponseSchema } from '@borneo/shared';
import type { z } from 'zod';

// SSR fetches Fastify directly; the browser goes through the /api proxy (ADR-0008).
const baseUrl = import.meta.env.SSR ? (process.env.API_URL ?? 'http://localhost:3000') : '/api';

/** A failed API call with the API's stable error code (api-design.md). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const isApiError = (e: unknown, status?: number): e is ApiError =>
  e instanceof ApiError && (status === undefined || e.status === status);

/** GET + Zod parse. Only feature `api/` folders call this. */
export async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) {
    const body = errorResponseSchema.safeParse(await res.json().catch(() => null));
    throw body.success
      ? new ApiError(res.status, body.data.error.code, body.data.error.message)
      : new ApiError(res.status, 'HTTP_ERROR', `GET ${path} failed: ${res.status}`);
  }
  return schema.parse(await res.json());
}
