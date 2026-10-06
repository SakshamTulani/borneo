import { MINUTE_MS } from '../time';

/** Stock is held only from payment start, for 5 minutes (D-56). */
export const HOLD_DURATION_MS = 5 * MINUTE_MS;
/** Gateway session timeout equals the hold (D-58). */
export const PAYMENT_SESSION_TIMEOUT_MS = HOLD_DURATION_MS;

export function startHold(now: number): { startedAt: number; expiresAt: number } {
  return { startedAt: now, expiresAt: now + HOLD_DURATION_MS };
}

/** Countdown source: real remaining time, never extended (D-56, D-57). */
export function holdStatus(
  hold: { expiresAt: number },
  now: number,
): { state: 'active' | 'expired'; remainingMs: number } {
  const remainingMs = Math.max(0, hold.expiresAt - now);
  return { state: remainingMs > 0 ? 'active' : 'expired', remainingMs };
}

export type PaymentOutcome =
  | { outcome: 'confirm' }
  | { outcome: 'confirmAfterExpiry' }
  | { outcome: 'refund'; notice: 'HOLD_EXPIRED_REFUNDED' };

/**
 * A successful payment: confirm within the hold; after expiry allocate if a unit is free,
 * otherwise refund automatically with a clear notice (D-59). A hold already released (its expiry
 * ran first) holds nothing, so that payment is treated as late whatever its time (D-212).
 */
export function resolvePaidOrder(input: {
  holdExpiresAt: number;
  paidAt: number;
  unitAvailableNow: boolean;
  holdReleased?: boolean;
}): PaymentOutcome {
  if (input.paidAt < input.holdExpiresAt && !input.holdReleased) return { outcome: 'confirm' };
  return input.unitAvailableNow
    ? { outcome: 'confirmAfterExpiry' }
    : { outcome: 'refund', notice: 'HOLD_EXPIRED_REFUNDED' };
}
