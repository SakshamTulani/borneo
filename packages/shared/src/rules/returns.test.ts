import { describe, expect, it } from 'vitest';
import { canRequestReturn, policySummary, returnWindowEndsAt } from './returns';

const delivered = Date.parse('2026-10-06T06:30:00Z'); // 6 Oct noon IST
const lastMoment = Date.parse('2026-10-13T18:29:59.999Z'); // 13 Oct 23:59:59.999 IST

describe('returns', () => {
  it('D-81: replacement-only categories never accept a return', () => {
    expect(
      canRequestReturn({
        policy: 'replacementOnly',
        deliveredAt: delivered,
        now: delivered,
        kind: 'return',
        reason: 'changedMind',
      }),
    ).toEqual({ ok: false, reason: 'REPLACEMENT_ONLY' });
  });

  it('D-89: the same item follows whichever policy its category config gives', () => {
    const req = {
      deliveredAt: delivered,
      now: delivered,
      kind: 'return' as const,
      reason: 'changedMind' as const,
    };
    expect(canRequestReturn({ ...req, policy: 'return' }).ok).toBe(true);
    expect(canRequestReturn({ ...req, policy: 'replacementOnly' }).ok).toBe(false);
  });

  it('D-87: the window closes at the end of the 7th IST day after delivery', () => {
    expect(returnWindowEndsAt(delivered)).toBe(lastMoment);
  });

  it('D-80: small electronics can be returned for any reason within 7 days', () => {
    expect(
      canRequestReturn({
        policy: 'return',
        deliveredAt: delivered,
        now: lastMoment,
        kind: 'return',
        reason: 'changedMind',
      }),
    ).toEqual({ ok: true, photosRequired: false });
    expect(
      canRequestReturn({
        policy: 'return',
        deliveredAt: delivered,
        now: lastMoment + 1,
        kind: 'return',
        reason: 'changedMind',
      }),
    ).toEqual({ ok: false, reason: 'WINDOW_CLOSED' });
  });

  it('D-82: phones/TVs get replacement for defect or damage within 7 days, never a return', () => {
    const base = { policy: 'replacementOnly' as const, deliveredAt: delivered, now: delivered };
    expect(canRequestReturn({ ...base, kind: 'replacement', reason: 'damage' })).toEqual({
      ok: true,
      photosRequired: true,
    });
    expect(canRequestReturn({ ...base, kind: 'return', reason: 'defect' })).toEqual({
      ok: false,
      reason: 'REPLACEMENT_ONLY',
    });
    expect(canRequestReturn({ ...base, kind: 'replacement', reason: 'changedMind' })).toEqual({
      ok: false,
      reason: 'REPLACEMENT_NEEDS_DEFECT',
    });
  });

  it('D-88: defect or damage requests need photos', () => {
    expect(
      canRequestReturn({
        policy: 'return',
        deliveredAt: delivered,
        now: delivered,
        kind: 'return',
        reason: 'defect',
      }),
    ).toEqual({ ok: true, photosRequired: true });
  });

  it('D-86: nothing can be requested before delivery', () => {
    expect(
      canRequestReturn({ policy: 'return', now: delivered, kind: 'return', reason: 'other' }),
    ).toEqual({ ok: false, reason: 'NOT_DELIVERED' });
  });

  it('D-84: plain-language policy text', () => {
    expect(policySummary('return')).toBe(
      'Return within 7 days of delivery for any reason. Replacement if it arrives damaged or defective.',
    );
    expect(policySummary('replacementOnly')).toContain('No returns for change of mind');
  });
});
