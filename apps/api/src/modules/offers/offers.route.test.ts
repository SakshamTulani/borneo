import { offerStripSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';

const db = useTestDb();
const app = testApp(db);

describe('GET /offers/live', () => {
  it('D-191: lists the seeded live flash sale first, then live payment offers and coupons', async () => {
    const res = await app.inject({ method: 'GET', url: '/offers/live' });
    expect(res.statusCode).toBe(200);
    const { items } = offerStripSchema.parse(res.json());
    expect(items[0]).toMatchObject({ kind: 'flash', productSlug: 'echo-buds-2' });
    // The upcoming flash sale is not in the strip.
    expect(items.filter((i) => i.kind === 'flash')).toHaveLength(1);
    expect(items.slice(1).every((i) => i.kind !== 'flash')).toBe(true);
    for (const i of items) {
      expect(i.kind === 'flash' ? i.endsAt : i.validTo).toBeGreaterThan(TEST_NOW.getTime());
    }
    expect(items.some((i) => i.kind === 'coupon' && i.code)).toBe(true);
  });
});
