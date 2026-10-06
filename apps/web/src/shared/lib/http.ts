import type { z } from 'zod';

// SSR fetches Fastify directly; the browser goes through the /api proxy (ADR-0008).
const baseUrl = import.meta.env.SSR ? (process.env.API_URL ?? 'http://localhost:3000') : '/api';

/** GET + Zod parse. Only feature `api/` folders call this. */
export async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return schema.parse(await res.json());
}
