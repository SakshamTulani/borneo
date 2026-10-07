import { accountSummarySchema, ownedDevicesSchema, type CustomerId } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import {
  headerSession,
  insertBuyer,
  insertDeliveredOrder,
  insertSellable,
  insertShopper,
  placeViaApi,
  putInCart,
} from '../../test/factories';

// Places orders of products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const app = testApp(db, { session: headerSession, demoMode: true });
const as = (customerId: CustomerId) => ({ 'x-test-customer': customerId });

const summary = async (customerId: CustomerId) =>
  accountSummarySchema.parse(
    (await app.inject({ method: 'GET', url: '/me/summary', headers: as(customerId) })).json(),
  );
const devices = async (customerId: CustomerId) =>
  ownedDevicesSchema.parse(
    (await app.inject({ method: 'GET', url: '/me/devices', headers: as(customerId) })).json(),
  );

describe('the account overview', () => {
  it('needs a session', async () => {
    expect((await app.inject({ method: 'GET', url: '/me/summary' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/me/devices' })).statusCode).toBe(401);
  });

  it('D-223: a new customer has nothing to count', async () => {
    const { customerId } = await insertShopper(db);
    expect(await summary(customerId)).toMatchObject({
      orders: 0,
      activeOrders: 0,
      devices: 0,
      reviewPrompts: 0,
      watching: 0,
      openReturns: 0,
    });
  });

  it('D-223: counts orders, active orders, devices, review prompts, watching and open returns', async () => {
    const { shopper, order } = await insertDeliveredOrder(app, db);
    const active = await insertSellable(db);
    // A second, still-active order for the same customer.
    await putInCart(db, shopper.customerId, active.key);
    await placeViaApi(app, shopper, 'cod');
    // Watching one out-of-stock product.
    const gone = await insertSellable(db, { stock: { blr: 0 } });
    await app.inject({
      method: 'PUT',
      url: `/me/watch/${gone.sku}`,
      headers: as(shopper.customerId),
    });
    // An open return on the delivered line.
    await app.inject({
      method: 'POST',
      url: `/me/orders/${order.id}/items/${order.items[0]!.id}/returns`,
      headers: as(shopper.customerId),
      payload: { kind: 'return', reason: 'changedMind' },
    });
    const view = await summary(shopper.customerId);
    expect(view).toMatchObject({
      orders: 2,
      activeOrders: 1,
      devices: 1,
      reviewPrompts: 1,
      watching: 1,
      openReturns: 1,
    });
    expect(view.memberSince).toBeGreaterThan(0);
  });
});

describe('owned devices', () => {
  it('D-24: only delivered products are owned', async () => {
    const item = await insertSellable(db);
    const shopper = await insertBuyer(db, item.key);
    await placeViaApi(app, shopper, 'cod');
    expect((await devices(shopper.customerId)).items).toEqual([]);
  });

  it('D-220: lists each delivered product once with its order and return window', async () => {
    const first = await insertDeliveredOrder(app, db);
    await insertDeliveredOrder(app, db, { shopper: first.shopper, sku: first.item.sku });
    const other = await insertDeliveredOrder(app, db, { shopper: first.shopper });
    const view = await devices(first.shopper.customerId);
    expect(view.items.map((d) => d.name).sort()).toEqual(
      [first.order.items[0]!.name, other.order.items[0]!.name].sort(),
    );
    for (const d of view.items) {
      expect(d.deliveredAt).toBe(TEST_NOW.getTime());
      expect(d.returnWindowEndsAt).toBeGreaterThan(TEST_NOW.getTime());
      expect(d.accessories).toEqual([]);
    }
  });

  it('D-220: a completed return removes the device', async () => {
    const { shopper, order } = await insertDeliveredOrder(app, db);
    const created = await app.inject({
      method: 'POST',
      url: `/me/orders/${order.id}/items/${order.items[0]!.id}/returns`,
      headers: as(shopper.customerId),
      payload: { kind: 'return', reason: 'changedMind' },
    });
    const id = created.json().id as string;
    for (let i = 0; i < 2; i++)
      await app.inject({
        method: 'POST',
        url: `/me/returns/${id}/demo/advance`,
        headers: as(shopper.customerId),
      });
    expect((await devices(shopper.customerId)).items).toEqual([]);
    // D-221: a returned item can still be reviewed.
    expect((await summary(shopper.customerId)).reviewPrompts).toBe(1);
  });
});
