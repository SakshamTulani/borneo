import { watchListSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';
import { headerSession, insertSellable, insertTwoCustomers } from '../../test/factories';
import { countWatch, findWatchTarget, listWatch, removeWatch } from './watch.repository';

// Adds products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const app = testApp(db, { session: headerSession });
const as = (c: string) => ({ 'x-test-customer': c });

async function ownerWatching() {
  const item = await insertSellable(db, { stock: { blr: 0 } });
  const { owner, other } = await insertTwoCustomers(db);
  const res = await app.inject({ method: 'PUT', url: `/me/watch/${item.sku}`, headers: as(owner) });
  expect(res.statusCode).toBe(200);
  return { owner, other, item };
}

describe('watch lists are scoped to their customer (D-96, D-222)', () => {
  it("repositories never show or remove another customer's watch", async () => {
    const { owner, other, item } = await ownerWatching();
    expect(await listWatch(other, db)).toEqual([]);
    expect(await countWatch(other, db)).toBe(0);
    expect((await findWatchTarget(other, db, item.sku))!.watching).toBe(false);
    expect((await findWatchTarget(owner, db, item.sku))!.watching).toBe(true);
    await removeWatch(other, db, item.variantId);
    expect(await countWatch(owner, db)).toBe(1);
  });

  it("routes only list and remove the signed-in customer's watch", async () => {
    const { owner, other, item } = await ownerWatching();
    const theirs = await app.inject({ method: 'GET', url: '/me/watch', headers: as(other) });
    expect(watchListSchema.parse(theirs.json()).items).toEqual([]);
    const removed = await app.inject({
      method: 'DELETE',
      url: `/me/watch/${item.sku}`,
      headers: as(other),
    });
    expect(watchListSchema.parse(removed.json()).items).toEqual([]);
    const mine = await app.inject({ method: 'GET', url: '/me/watch', headers: as(owner) });
    expect(watchListSchema.parse(mine.json()).items.map((i) => i.sku)).toEqual([item.sku]);
  });
});
