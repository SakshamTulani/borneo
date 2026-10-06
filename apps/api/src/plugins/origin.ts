import type { FastifyInstance } from 'fastify';
import { AppError } from '../errors';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cookie-authenticated writes only from our own web origin (CSRF defence in depth; the session
 * cookie is also SameSite=Lax). Requests without an Origin header (server to server) pass.
 */
export function registerOriginGuard(app: FastifyInstance, allowedOrigins: readonly string[]) {
  app.addHook('onRequest', async (request) => {
    if (SAFE.has(request.method)) return;
    const origin = request.headers.origin;
    if (origin !== undefined && !allowedOrigins.includes(origin)) {
      throw new AppError(403, 'FORBIDDEN_ORIGIN', 'This request came from another site.');
    }
  });
}
