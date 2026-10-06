import type { FastifyRequest } from 'fastify';
import { toCustomerId, type CustomerId } from '@borneo/shared';
import { AppError } from '../errors';
import type { BetterAuth } from './betterAuth';

/**
 * The only code that reads the session (ADR-0005). Routes call `requireCustomerId` and pass the
 * CustomerId down; services and repositories never import this module.
 */
export type SessionReader = (request: FastifyRequest) => Promise<CustomerId | null>;

export async function requireCustomerId(
  session: SessionReader,
  request: FastifyRequest,
): Promise<CustomerId> {
  const customerId = await session(request);
  if (!customerId) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return customerId;
}

/** Reads the Better Auth session cookie. */
export function betterAuthSession({ auth }: BetterAuth): SessionReader {
  return async (request) => {
    const cookie = request.headers.cookie;
    if (!cookie) return null;
    const found = await auth.api.getSession({ headers: new Headers({ cookie }) });
    return found ? toCustomerId(found.user.id) : null;
  };
}

export {
  betterAuthIdentity,
  createBetterAuth,
  type AuthConfig,
  type BetterAuth,
} from './betterAuth';
