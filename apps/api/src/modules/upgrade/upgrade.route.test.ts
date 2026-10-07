import { toCustomerId, upgradeForProductSchema, upgradeStripSchema } from '@borneo/shared';
import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { order, orderItem } from '../../db/schema/index';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import { headerSession, insertCustomer } from '../../test/factories';

const db = useTestDb();
const DAY = 86_400_000;
const later = testApp(db, { session: headerSession, now: () => TEST_NOW.getTime() + 30 * DAY });
const as = (id: string) => ({ 'x-test-customer': id });

/** A seeded demo customer who received a Nova 2 (D-200 demo orders). */
async function novaOwner() {
  const [row] = await db
    .select({ customerId: order.customerId })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(and(eq(orderItem.productName, 'Borneo Nova 2'), eq(order.status, 'delivered')))
    .limit(1);
  return toCustomerId(row!.customerId);
}

describe('upgrades', () => {
  it('D-136: the home strip suggests the newest live upgrade in an owned line', async () => {
    const owner = await novaOwner();
    const res = await later.inject({ method: 'GET', url: '/me/upgrades', headers: as(owner) });
    expect(res.statusCode).toBe(200);
    const strip = upgradeStripSchema.parse(res.json());
    const nova = strip.items.find((i) => i.from.slug === 'nova-2');
    expect(nova?.to.slug).toBe('nova-3');
  });

  it('D-130: the badge names the owned device; D-133 what you gain lists real gains', async () => {
    const owner = await novaOwner();
    const view = upgradeForProductSchema.parse(
      (
        await later.inject({ method: 'GET', url: '/me/upgrades/nova-3', headers: as(owner) })
      ).json(),
    );
    expect(view.badge).toEqual({ fromName: 'Borneo Nova 2', fromSlug: 'nova-2' });
    expect(view.gains.length + view.changes.length).toBeGreaterThan(0);
  });

  it('D-131: never a downgrade or another line', async () => {
    const owner = await novaOwner();
    for (const slug of ['nova-2', 'pulse-4', 'echo-buds-2']) {
      const view = upgradeForProductSchema.parse(
        (
          await later.inject({ method: 'GET', url: `/me/upgrades/${slug}`, headers: as(owner) })
        ).json(),
      );
      expect(view).toEqual({ badge: null, gains: [], changes: [] });
    }
  });

  it('D-132: hidden while the owned item is inside its return window', async () => {
    const owner = await novaOwner();
    const [row] = await db
      .select({ ends: orderItem.returnWindowEndsAt })
      .from(orderItem)
      .innerJoin(order, eq(order.id, orderItem.orderId))
      .where(and(eq(order.customerId, owner), eq(orderItem.productName, 'Borneo Nova 2')));
    const inside = testApp(db, { session: headerSession, now: () => row!.ends!.getTime() - 1000 });
    const view = upgradeForProductSchema.parse(
      (
        await inside.inject({ method: 'GET', url: '/me/upgrades/nova-3', headers: as(owner) })
      ).json(),
    );
    expect(view.badge).toBeNull();
  });

  it('D-24: nothing for someone who owns nothing; signed out is 401', async () => {
    const nobody = await insertCustomer(db);
    const strip = upgradeStripSchema.parse(
      (await later.inject({ method: 'GET', url: '/me/upgrades', headers: as(nobody) })).json(),
    );
    expect(strip.items).toEqual([]);
    expect((await later.inject({ method: 'GET', url: '/me/upgrades' })).statusCode).toBe(401);
  });
});
