import { and, eq } from 'drizzle-orm';
import { watchListSchema, type CustomerId } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { inventory } from '../../db/schema/index';
import { seedId } from '../../db/seed/ids';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import { headerSession, insertCustomer, insertSellable } from '../../test/factories';

// Adds products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const app = testApp(db, { session: headerSession });
const as = (customerId: CustomerId) => ({ 'x-test-customer': customerId });

const call = (method: 'GET' | 'PUT' | 'DELETE', customerId: CustomerId, sku?: string) =>
  app.inject({ method, url: sku ? `/me/watch/${sku}` : '/me/watch', headers: as(customerId) });

describe('Watch', () => {
  it('needs a session', async () => {
    expect((await app.inject({ method: 'GET', url: '/me/watch' })).statusCode).toBe(401);
  });

  it('D-222: an out-of-stock variant can be watched and is listed as it stands now', async () => {
    const item = await insertSellable(db, { stock: { blr: 0 } });
    const customer = await insertCustomer(db);
    const res = await call('PUT', customer, item.sku);
    expect(res.statusCode).toBe(200);
    const list = watchListSchema.parse(res.json());
    expect(list.items).toEqual([
      expect.objectContaining({
        sku: item.sku,
        availability: 'outOfStock',
        pricePaise: 199_900,
        createdAt: TEST_NOW.getTime(),
      }),
    ]);
    // Watching twice is the same as once.
    expect(
      watchListSchema.parse((await call('PUT', customer, item.sku)).json()).items,
    ).toHaveLength(1);

    // Back in stock: the list says so.
    await db
      .update(inventory)
      .set({ onHand: 2 })
      .where(
        and(
          eq(inventory.variantId, item.variantId),
          eq(inventory.warehouseId, seedId('warehouse', 'blr')),
        ),
      );
    const now = watchListSchema.parse((await call('GET', customer)).json());
    expect(now.items.map((i) => i.availability)).toEqual(['inStock']);
  });

  it('D-147: an in-stock variant is 422 IN_STOCK', async () => {
    const item = await insertSellable(db, { stock: { blr: 2 } });
    const customer = await insertCustomer(db);
    const res = await call('PUT', customer, item.sku);
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('IN_STOCK');
    expect(watchListSchema.parse((await call('GET', customer)).json()).items).toEqual([]);
  });

  it('an unknown SKU is 404', async () => {
    const customer = await insertCustomer(db);
    const res = await call('PUT', customer, 'NO-SUCH-SKU');
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('D-222: the customer can stop watching', async () => {
    const item = await insertSellable(db, { stock: { blr: 0 } });
    const customer = await insertCustomer(db);
    await call('PUT', customer, item.sku);
    const res = await call('DELETE', customer, item.sku);
    expect(res.statusCode).toBe(200);
    expect(watchListSchema.parse(res.json()).items).toEqual([]);
  });
});
