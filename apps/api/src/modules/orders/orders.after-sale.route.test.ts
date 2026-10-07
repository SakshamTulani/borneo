import { and, eq } from 'drizzle-orm';
import { orderPageSchema, orderViewSchema, type CustomerId } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { inventory, notification, refund } from '../../db/schema/index';
import { seedId } from '../../db/seed/ids';
import { appDeps } from '../../services';
import { TEST_ORIGIN, testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import {
  advanceViaApi,
  headerSession,
  insertBuyer,
  insertSellable,
  insertShopper,
  placeViaApi,
  putInCart,
} from '../../test/factories';

// Adds products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const app = testApp(db, { session: headerSession, demoMode: true });
const live = testApp(db, { session: headerSession, demoMode: false });
const as = (customerId: CustomerId) => ({ 'x-test-customer': customerId });

const stockOf = async (variantId: string) => {
  const [row] = await db
    .select()
    .from(inventory)
    .where(
      and(
        eq(inventory.variantId, variantId),
        eq(inventory.warehouseId, seedId('warehouse', 'blr')),
      ),
    );
  return { onHand: row!.onHand, reserved: row!.reserved };
};

const cancel = (customerId: CustomerId, orderId: string, on = app) =>
  on.inject({ method: 'POST', url: `/me/orders/${orderId}/cancel`, headers: as(customerId) });
const advance = (customerId: CustomerId, orderId: string, on = app) =>
  on.inject({ method: 'POST', url: `/me/orders/${orderId}/demo/advance`, headers: as(customerId) });
const inbox = async (customerId: CustomerId) =>
  (await db.select().from(notification).where(eq(notification.customerId, customerId))).map(
    (n) => n.kind,
  );

describe('the order list', () => {
  it('needs a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/orders' });
    expect(res.statusCode).toBe(401);
  });

  it('lists newest first in keyset pages with a cursor to the next one', async () => {
    const item = await insertSellable(db, { stock: { blr: 5 } });
    const shopper = await insertShopper(db);
    const placed: string[] = [];
    for (let i = 0; i < 3; i++) {
      await putInCart(db, shopper.customerId, item.key, 1);
      placed.push((await placeViaApi(app, shopper, 'cod')).id);
    }
    const first = orderPageSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: '/me/orders?limit=2',
          headers: as(shopper.customerId),
        })
      ).json(),
    );
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    expect(first.items[0]).toMatchObject({ status: 'confirmed', totalPaise: 199_900 });
    expect(first.items[0]!.items.map((i) => i.name)).toEqual([
      expect.stringMatching(/^Order fixture/),
    ]);
    const second = orderPageSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/me/orders?limit=2&cursor=${first.nextCursor}`,
          headers: as(shopper.customerId),
        })
      ).json(),
    );
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    // Same placed time (pinned clock): the id breaks the tie, so every order appears once.
    const seen = [...first.items, ...second.items].map((o) => o.id);
    expect(new Set(seen)).toEqual(new Set(placed));
  });

  it('each row counts the units in the order', async () => {
    const item = await insertSellable(db, { stock: { blr: 5 } });
    const shopper = await insertBuyer(db, item.key, 3);
    await placeViaApi(app, shopper, 'cod');
    const page = orderPageSchema.parse(
      (
        await app.inject({ method: 'GET', url: '/me/orders', headers: as(shopper.customerId) })
      ).json(),
    );
    expect(page.items.map((o) => o.itemCount)).toEqual([3]);
  });

  it('a cursor that is not ours is 400 INVALID_CURSOR', async () => {
    const shopper = await insertShopper(db);
    const res = await app.inject({
      method: 'GET',
      url: '/me/orders?cursor=not-a-cursor',
      headers: as(shopper.customerId),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_CURSOR');
  });
});

describe('cancelling', () => {
  it('D-216: a COD order is cancelled, its stock goes back and nothing is refunded', async () => {
    const item = await insertSellable(db, { stock: { blr: 3 } });
    const shopper = await insertBuyer(db, item.key, 2);
    const order = await placeViaApi(app, shopper, 'cod');
    expect(order.canCancel).toBe(true);
    expect((await stockOf(item.variantId)).reserved).toBe(2);
    const res = await cancel(shopper.customerId, order.id);
    expect(res.statusCode).toBe(200);
    const view = orderViewSchema.parse(res.json());
    expect(view).toMatchObject({
      status: 'cancelled',
      notice: 'CANCELLED_BY_CUSTOMER',
      canCancel: false,
      refunds: [],
      demoNextStep: null,
    });
    expect(await stockOf(item.variantId)).toEqual({ onHand: 3, reserved: 0 });
    expect(await inbox(shopper.customerId)).toContain('order_cancelled');
  });

  it('D-216: a paid prepaid order is refunded in full to the original method', async () => {
    const item = await insertSellable(db);
    const shopper = await insertBuyer(db, item.key);
    const order = await placeViaApi(app, shopper, 'upi', { pay: true });
    expect(order.status).toBe('confirmed');
    const view = orderViewSchema.parse((await cancel(shopper.customerId, order.id)).json());
    expect(view.status).toBe('cancelled');
    expect(view.refunds).toEqual([
      expect.objectContaining({ amountPaise: order.totalPaise, status: 'processed' }),
    ]);
    expect((await stockOf(item.variantId)).reserved).toBe(0);
  });

  it('D-216: a pending payment ends with nothing charged and the hold released', async () => {
    const item = await insertSellable(db);
    const shopper = await insertBuyer(db, item.key);
    const order = await placeViaApi(app, shopper, 'upi');
    expect(order.status).toBe('pending_payment');
    const view = orderViewSchema.parse((await cancel(shopper.customerId, order.id)).json());
    expect(view).toMatchObject({ status: 'cancelled', refunds: [], holdExpiresAt: null });
    expect(view.payment.attemptId).toBeNull();
    expect((await stockOf(item.variantId)).reserved).toBe(0);
    // The mock gateway can no longer take the money.
    const pay = await app.inject({
      method: 'POST',
      url: `/me/orders/${order.id}/payments/${order.payment.attemptId}/mock`,
      headers: as(shopper.customerId),
      payload: { result: 'success' },
    });
    expect(pay.statusCode).toBe(409);
  });

  it('D-216: a payment arriving after the customer cancelled is refunded; the order stays cancelled', async () => {
    const deps = appDeps(db, {
      demoMode: true,
      auth: { secret: 'test-auth-secret-at-least-32-characters', baseURL: `${TEST_ORIGIN}/api` },
      webOrigin: TEST_ORIGIN,
      now: () => TEST_NOW.getTime() + 30_000,
      log: { info: () => {}, warn: () => {} },
    });
    const withDeps = buildApp({ ...deps, session: headerSession });
    const item = await insertSellable(db);
    const shopper = await insertBuyer(db, item.key);
    const order = await placeViaApi(withDeps, shopper, 'upi');
    await cancel(shopper.customerId, order.id, withDeps);
    await deps.orders.paymentSucceeded(shopper.customerId, order.id, order.payment.attemptId!);
    const view = orderViewSchema.parse(
      (
        await withDeps.inject({
          method: 'GET',
          url: `/me/orders/${order.id}`,
          headers: as(shopper.customerId),
        })
      ).json(),
    );
    expect(view.status).toBe('cancelled');
    expect(view.refunds.map((r) => r.amountPaise)).toEqual([order.totalPaise]);
    expect((await stockOf(item.variantId)).reserved).toBe(0);
    expect((await inbox(shopper.customerId)).sort()).toEqual(['order_cancelled', 'order_refunded']);
    // A repeated callback refunds nothing more.
    await deps.orders.paymentSucceeded(shopper.customerId, order.id, order.payment.attemptId!);
    const refunds = await db.select().from(refund).where(eq(refund.orderId, order.id));
    expect(refunds).toHaveLength(1);
  });

  it('D-149: a packed order can still be cancelled', async () => {
    const item = await insertSellable(db);
    const shopper = await insertBuyer(db, item.key);
    const order = await placeViaApi(app, shopper, 'cod');
    const packed = await advanceViaApi(app, shopper.customerId, order.id, 1);
    expect(packed).toMatchObject({ status: 'packed', canCancel: true });
    expect((await cancel(shopper.customerId, order.id)).statusCode).toBe(200);
    expect((await stockOf(item.variantId)).reserved).toBe(0);
  });

  it('D-149: once shipped it is 409 CANNOT_CANCEL and nothing changes', async () => {
    const item = await insertSellable(db, { stock: { blr: 4 } });
    const shopper = await insertBuyer(db, item.key);
    const order = await placeViaApi(app, shopper, 'cod');
    const shipped = await advanceViaApi(app, shopper.customerId, order.id, 2);
    expect(shipped.canCancel).toBe(false);
    const res = await cancel(shopper.customerId, order.id);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CANNOT_CANCEL');
    expect(await stockOf(item.variantId)).toEqual({ onHand: 3, reserved: 0 });
  });

  it('an unknown order is 404', async () => {
    const shopper = await insertShopper(db);
    const res = await cancel(shopper.customerId, seedId('order', 'none'));
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('ORDER_NOT_FOUND');
  });
});

describe('tracking and the demo courier', () => {
  it('D-215: a confirmed order moves one step per Advance up to delivered', async () => {
    const item = await insertSellable(db, { stock: { blr: 4 } });
    const shopper = await insertBuyer(db, item.key);
    const order = await placeViaApi(app, shopper, 'cod');
    expect(order.demoNextStep).toBe('packed');
    expect(order.tracking.steps.map((s) => [s.step, s.state])).toEqual([
      ['placed', 'done'],
      ['confirmed', 'done'],
      ['packed', 'current'],
      ['shipped', 'upcoming'],
      ['outForDelivery', 'upcoming'],
      ['delivered', 'upcoming'],
    ]);
    expect(order.tracking.steps[0]!.at).toBe(TEST_NOW.getTime());
    expect(order.items[0]!.returnOptions).toEqual([]);

    const packed = await advanceViaApi(app, shopper.customerId, order.id, 1);
    expect(packed).toMatchObject({ status: 'packed', demoNextStep: 'shipped' });
    expect(packed.tracking.courier).toBeNull();

    const shipped = await advanceViaApi(app, shopper.customerId, order.id, 1);
    expect(shipped).toMatchObject({ status: 'shipped', demoNextStep: 'outForDelivery' });
    expect(shipped.tracking.courier).toBe('Borneo Express (demo)');
    expect(shipped.tracking.trackingNo).toMatch(/^BX\d{8}IN$/);
    // The units leave the warehouse: on hand and reserved both drop.
    expect(await stockOf(item.variantId)).toEqual({ onHand: 3, reserved: 0 });

    const out = await advanceViaApi(app, shopper.customerId, order.id, 1);
    expect(out).toMatchObject({ status: 'shipped', demoNextStep: 'delivered' });
    expect(out.tracking.steps.find((s) => s.step === 'outForDelivery')!.state).toBe('done');
    expect(out.tracking.steps.find((s) => s.step === 'delivered')!.state).toBe('current');

    const delivered = await advanceViaApi(app, shopper.customerId, order.id, 1);
    expect(delivered).toMatchObject({
      status: 'delivered',
      deliveredAt: TEST_NOW.getTime(),
      demoNextStep: null,
      canCancel: false,
    });
    expect(delivered.tracking.steps.every((s) => s.state === 'done')).toBe(true);
    // D-87: every line's return window is stamped; returns and replacements open (D-217).
    expect(delivered.items[0]!.returnWindowEndsAt).toBeGreaterThan(TEST_NOW.getTime());
    expect(delivered.items[0]!.returnOptions.map((o) => o.kind)).toEqual(['return', 'replacement']);
    expect(delivered.items[0]!.returnRequest).toBeNull();
    expect(await stockOf(item.variantId)).toEqual({ onHand: 3, reserved: 0 });

    const again = await advance(shopper.customerId, order.id);
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('NOTHING_TO_ADVANCE');
    expect((await inbox(shopper.customerId)).sort()).toEqual([
      'order_confirmed',
      'order_delivered',
      'order_shipped',
    ]);
  });

  it('D-215: a pending payment has nothing to advance', async () => {
    const item = await insertSellable(db);
    const shopper = await insertBuyer(db, item.key);
    const order = await placeViaApi(app, shopper, 'upi');
    expect(order.demoNextStep).toBeNull();
    const res = await advance(shopper.customerId, order.id);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('NOTHING_TO_ADVANCE');
  });

  it('D-215: the demo courier is off outside demo mode (404, no next step shown)', async () => {
    const item = await insertSellable(db);
    const shopper = await insertBuyer(db, item.key);
    const order = await placeViaApi(live, shopper, 'cod');
    expect(order.demoNextStep).toBeNull();
    const res = await advance(shopper.customerId, order.id, live);
    expect(res.statusCode).toBe(404);
    const after = orderViewSchema.parse(
      (
        await live.inject({
          method: 'GET',
          url: `/me/orders/${order.id}`,
          headers: as(shopper.customerId),
        })
      ).json(),
    );
    expect(after.status).toBe('confirmed');
  });
});
