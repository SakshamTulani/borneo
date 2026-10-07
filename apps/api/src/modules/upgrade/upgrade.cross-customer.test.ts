import { toCustomerId } from '@borneo/shared';
import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { order, orderItem } from '../../db/schema/index';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import { headerSession, insertCustomer } from '../../test/factories';
import { listOwnedForUpgrade } from './upgrade.repository';

const db = useTestDb();

describe('upgrades are scoped to their customer (D-96)', () => {
  it("another customer never sees the owner's devices or upgrades", async () => {
    const [row] = await db
      .select({ customerId: order.customerId })
      .from(orderItem)
      .innerJoin(order, eq(order.id, orderItem.orderId))
      .where(and(eq(orderItem.productName, 'Borneo Nova 2'), eq(order.status, 'delivered')))
      .limit(1);
    const owner = toCustomerId(row!.customerId);
    const other = await insertCustomer(db);
    expect((await listOwnedForUpgrade(owner, db)).length).toBeGreaterThan(0);
    expect(await listOwnedForUpgrade(other, db)).toEqual([]);
    const app = testApp(db, {
      session: headerSession,
      now: () => TEST_NOW.getTime() + 30 * 86_400_000,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/me/upgrades/nova-3',
      headers: { 'x-test-customer': other },
    });
    expect(res.json()).toEqual({ badge: null, gains: [], changes: [] });
  });
});
