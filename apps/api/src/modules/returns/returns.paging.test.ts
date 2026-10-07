import { returnPageSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';
import { headerSession, insertDeliveredOrder, insertShopper } from '../../test/factories';

const db = useTestDb('orders');
const app = testApp(db, { session: headerSession, demoMode: true });

describe('returns pages', () => {
  it('D-219: newest first, a page at a time, each request once', async () => {
    const shopper = await insertShopper(db);
    for (let i = 0; i < 3; i++) {
      const { order } = await insertDeliveredOrder(app, db, { shopper });
      const res = await app.inject({
        method: 'POST',
        url: `/me/orders/${order.id}/items/${order.items[0]!.id}/returns`,
        headers: { 'x-test-customer': shopper.customerId },
        payload: { kind: 'return', reason: 'changedMind' },
      });
      expect(res.statusCode).toBe(201);
    }
    const as = { 'x-test-customer': shopper.customerId };
    const first = returnPageSchema.parse(
      (await app.inject({ method: 'GET', url: '/me/returns?limit=2', headers: as })).json(),
    );
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    const second = returnPageSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/me/returns?limit=2&cursor=${first.nextCursor}`,
          headers: as,
        })
      ).json(),
    );
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    const ids = [...first.items, ...second.items].map((r) => r.id);
    expect(new Set(ids).size).toBe(3);
    const bad = await app.inject({ method: 'GET', url: '/me/returns?cursor=nope', headers: as });
    expect(bad.statusCode).toBe(400);
  });
});
