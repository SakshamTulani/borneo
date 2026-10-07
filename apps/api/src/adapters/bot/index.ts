import { randomUUID } from 'node:crypto';

/**
 * BotProtection port (ADR-0003, D-143, D-166). Flash checkout sends a token from the provider's
 * challenge; `verify` checks it. The demo issues its own tokens from a mock check (D-232).
 */
export type BotProtection = {
  /** False when no provider is configured: flash orders are refused (blocker D-144). */
  available: boolean;
  /** Demo only: the mock challenge's answer. */
  issue(): { token: string; expiresAt: number };
  verify(token: string | undefined): boolean;
};

/** Mock check tokens last this long (D-232). */
export const BOT_TOKEN_TTL_MS = 5 * 60_000;

/** Demo: tokens kept in memory (one process) until they expire. Nothing leaves the system. */
export function createDemoBotProtection(now: () => number = Date.now): BotProtection {
  const tokens = new Map<string, number>();
  return {
    available: true,
    issue() {
      const t = now();
      for (const [k, exp] of tokens) if (exp <= t) tokens.delete(k);
      const token = `demo_${randomUUID()}`;
      const expiresAt = t + BOT_TOKEN_TTL_MS;
      tokens.set(token, expiresAt);
      return { token, expiresAt };
    },
    verify(token) {
      const exp = token ? tokens.get(token) : undefined;
      return exp !== undefined && exp > now();
    },
  };
}

/** Outside demo mode until a real provider exists (production blocker D-144). */
export function createUnconfiguredBotProtection(): BotProtection {
  return {
    available: false,
    issue() {
      throw new Error('No bot protection configured (D-144)');
    },
    verify: () => false,
  };
}
