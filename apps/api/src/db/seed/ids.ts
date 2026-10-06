import { createHash } from 'node:crypto';

/**
 * Stable name-based uuid (v5 layout over SHA-1) so seeded ids survive `db:reset`:
 * links, fixtures and tests can rely on them.
 */
export function seedId(kind: string, key: string): string {
  const h = createHash('sha1').update(`borneo-seed:${kind}:${key}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

/** Rupees to paise for readable seed prices (ADR-0006). */
export const inr = (rupees: number) => rupees * 100;
