import { describe, expect, it } from 'vitest';
import {
  HOLD_DURATION_MS,
  PAYMENT_SESSION_TIMEOUT_MS,
  holdStatus,
  resolvePaidOrder,
  startHold,
} from './hold';

describe('stock hold', () => {
  it('D-56: a hold lasts exactly 5 minutes from payment start', () => {
    expect(HOLD_DURATION_MS).toBe(300_000);
    expect(startHold(1_000)).toEqual({ startedAt: 1_000, expiresAt: 301_000 });
  });

  it('D-58: the gateway session timeout equals the hold', () => {
    expect(PAYMENT_SESSION_TIMEOUT_MS).toBe(HOLD_DURATION_MS);
  });

  it('D-57: status counts down and expires, never negative', () => {
    expect(holdStatus({ expiresAt: 301_000 }, 1_000)).toEqual({
      state: 'active',
      remainingMs: 300_000,
    });
    expect(holdStatus({ expiresAt: 301_000 }, 301_000)).toEqual({
      state: 'expired',
      remainingMs: 0,
    });
    expect(holdStatus({ expiresAt: 301_000 }, 400_000).remainingMs).toBe(0);
  });

  it('D-59: payment within the hold confirms', () => {
    expect(
      resolvePaidOrder({ holdExpiresAt: 301_000, paidAt: 300_999, unitAvailableNow: false }),
    ).toEqual({ outcome: 'confirm' });
  });

  it('D-59: late payment allocates if a unit is free, else refunds with a notice', () => {
    expect(
      resolvePaidOrder({ holdExpiresAt: 301_000, paidAt: 301_000, unitAvailableNow: true }),
    ).toEqual({ outcome: 'confirmAfterExpiry' });
    expect(
      resolvePaidOrder({ holdExpiresAt: 301_000, paidAt: 350_000, unitAvailableNow: false }),
    ).toEqual({ outcome: 'refund', notice: 'HOLD_EXPIRED_REFUNDED' });
  });
});
