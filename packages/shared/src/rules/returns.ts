import { endOfIstDayAfter } from '../time';

import type { ReturnPolicy } from '../contracts/catalog';

export type { ReturnPolicy };
export const RETURN_WINDOW_DAYS = 7;

/** Window closes at the end of the 7th IST day after delivery, for both policies (D-80, D-82, D-87). */
export function returnWindowEndsAt(deliveredAt: number): number {
  return endOfIstDayAfter(deliveredAt, RETURN_WINDOW_DAYS);
}

export type ReturnReason = 'defect' | 'damage' | 'changedMind' | 'other';
export type ReturnBlock =
  'NOT_DELIVERED' | 'WINDOW_CLOSED' | 'REPLACEMENT_ONLY' | 'REPLACEMENT_NEEDS_DEFECT';

/**
 * Self-serve request rules (D-86). The policy comes from category config, never a hardcoded
 * category key (D-89). Replacement-only categories accept replacements for defect or damage (D-81). Defect/damage needs photos (D-88).
 */
export function canRequestReturn(input: {
  policy: ReturnPolicy;
  deliveredAt?: number;
  now: number;
  kind: 'return' | 'replacement';
  reason: ReturnReason;
}): { ok: true; photosRequired: boolean } | { ok: false; reason: ReturnBlock } {
  const { policy, deliveredAt, now, kind, reason } = input;
  if (deliveredAt === undefined) return { ok: false, reason: 'NOT_DELIVERED' };
  if (now > returnWindowEndsAt(deliveredAt)) return { ok: false, reason: 'WINDOW_CLOSED' };
  if (policy === 'replacementOnly' && kind === 'return')
    return { ok: false, reason: 'REPLACEMENT_ONLY' };
  const defective = reason === 'defect' || reason === 'damage';
  if (kind === 'replacement' && !defective)
    return { ok: false, reason: 'REPLACEMENT_NEEDS_DEFECT' };
  return { ok: true, photosRequired: defective };
}

/** Plain-language policy for PDP and cart (D-84). */
export function policySummary(policy: ReturnPolicy): string {
  return policy === 'replacementOnly'
    ? `Replacement within ${RETURN_WINDOW_DAYS} days of delivery if it arrives damaged or defective. No returns for change of mind.`
    : `Return within ${RETURN_WINDOW_DAYS} days of delivery for any reason. Replacement if it arrives damaged or defective.`;
}
