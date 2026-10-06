import type { FastifyRequest } from 'fastify';
import type { CustomerId } from '@borneo/shared';

/**
 * The only place that reads the session. Routes call this and pass the
 * CustomerId down. Services and repositories must not import this module.
 * Real implementation (Better Auth) lands in Phase H.
 */
export function requireCustomerId(_request: FastifyRequest): CustomerId {
  throw Object.assign(new Error('Not authenticated'), { statusCode: 401 });
}
