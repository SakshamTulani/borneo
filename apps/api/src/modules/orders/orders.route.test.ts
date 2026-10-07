import { and, eq } from 'drizzle-orm';
import { checkoutViewSchema, orderViewSchema, type CustomerId } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { inventory, notification, stockHold } from '../../db/schema/index';
import { seedId } from '../../db/seed/ids';
import { appDeps } from '../../services';
import { TEST_ORIGIN } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import { headerSession, insertSellable, insertShopper } from '../../test/factories';
import { changeCart } from '../cart/index';
import { LATE_PAYMENT_DELAY_MS, type OrderJobs } from './index';

// Adds products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const FIVE_MIN = 5 * 60_000;

/** The real app on the test database with a clock the test moves, and its services. */
function setup(demoMode = true, jobs?: OrderJobs) {
  let at = TEST_NOW.getTime();
  const deps = appDeps(db, {
    demoMode,
    ...(jobs ? { jobs } : {}),
    auth: { secret: 'test-auth-secret-at-least-32-characters', baseURL: `${TEST_ORIGIN}/api` },
    webOrigin: TEST_ORIGIN,
    now: () => at,
    log: { info: () => {}, warn: () => {} },
  });
  const app = buildApp({ ...deps, session: headerSession });
  return { app, deps, advance: (ms: number) => (at += ms) };
}

const as = (customerId: CustomerId) => ({ 'x-test-customer': customerId });
let keys = 0;
const newKey = () => `test-key-${Date.now()}-${keys++}`;

async function shopperWith(cartKey: string, qty = 1) {
  const shopper = await insertShopper(db);
  await changeCart(shopper.customerId, db, () => ({
    entries: [{ key: cartKey, qty }],
    couponCode: undefined,
  }));
  return shopper;
}

async function place(
  app: ReturnType<typeof setup>['app'],
  shopper: { customerId: CustomerId; addressId: string },
  payment: { method: 'upi' | 'card' | 'emi' | 'cod' },
  over: { key?: string; expectedTotalPaise?: number } = {},
) {
  const quote = await app.inject({
    method: 'GET',
    url: `/me/checkout?method=${payment.method}`,
    headers: as(shopper.customerId),
  });
  const view = checkoutViewSchema.parse(quote.json());
  return app.inject({
    method: 'POST',
    url: '/me/orders',
    headers: { ...as(shopper.customerId), 'idempotency-key': over.key ?? newKey() },
    payload: {
      addressId: shopper.addressId,
      payment,
      expectedTotalPaise: over.expectedTotalPaise ?? view.totals.totalPaise,
    },
  });
}

const reserved = async (variantId: string, code = 'blr') => {
  const [row] = await db
    .select()
    .from(inventory)
    .where(
      and(eq(inventory.variantId, variantId), eq(inventory.warehouseId, seedId('warehouse', code))),
    );
  return row!.reserved;
};

describe('checkout', () => {
  it('needs a session', async () => {
    const { app } = setup();
    const res = await app.inject({ method: 'GET', url: '/me/checkout' });
    expect(res.statusCode).toBe(401);
  });

  it('D-55: prices the cart at the default address; nothing is chosen for the customer (D-06)', async () => {
    const { app } = setup();
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const res = await app.inject({
      method: 'GET',
      url: '/me/checkout',
      headers: as(shopper.customerId),
    });
    expect(res.statusCode).toBe(200);
    const view = checkoutViewSchema.parse(res.json());
    expect(view.addressId).toBe(shopper.addressId);
    expect(view.cart.lines[0]!.delivery?.status).toBe('deliverable');
    expect(view.blocks).toEqual(['NO_PAYMENT_METHOD']);
    expect(view.methods.find((m) => m.method === 'cod')!.allowed).toBe(true);
    expect(view.cart.suggestions).toEqual([]);
  });
});

describe('placing an order', () => {
  it('D-205: COD is confirmed at once, stock allocated, invoice issued, cart cleared (D-207)', async () => {
    const { app } = setup();
    const item = await insertSellable(db, { stock: { blr: 3 } });
    const shopper = await shopperWith(item.key, 2);
    const res = await place(app, shopper, { method: 'cod' });
    expect(res.statusCode).toBe(200);
    const order = orderViewSchema.parse(res.json());
    expect(order.status).toBe('confirmed');
    expect(order.number).toMatch(/^BN-\d{6,}$/);
    expect(order.invoiceNumber).toMatch(/^INV2627-\d{6}$/);
    expect(order.holdExpiresAt).toBeNull();
    expect(order.items).toMatchObject([{ sku: item.sku, qty: 2, unitPricePaise: 199_900 }]);
    expect(order.eta).not.toBeNull();
    expect(await reserved(item.variantId)).toBe(2);

    const cart = await app.inject({
      method: 'GET',
      url: '/me/cart',
      headers: as(shopper.customerId),
    });
    expect(cart.json().lines).toEqual([]);
    const inbox = await db
      .select()
      .from(notification)
      .where(eq(notification.customerId, shopper.customerId));
    expect(inbox.map((n) => n.kind)).toEqual(['order_confirmed']);
  });

  it('D-201: a total different from what the customer saw is refused with the new total', async () => {
    const { app } = setup();
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const res = await place(app, shopper, { method: 'cod' }, { expectedTotalPaise: 100 });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatchObject({
      code: 'PRICE_CHANGED',
      details: { totalPaise: 199_900 },
    });
    expect(await reserved(item.variantId)).toBe(0);
  });

  it('places once per Idempotency-Key and requires one', async () => {
    const { app } = setup();
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const key = newKey();
    const first = await place(app, shopper, { method: 'cod' }, { key });
    const again = await place(app, shopper, { method: 'cod' }, { key });
    expect(again.statusCode).toBe(200);
    expect(again.json().id).toBe(first.json().id);
    expect(await reserved(item.variantId)).toBe(1);

    const missing = await app.inject({
      method: 'POST',
      url: '/me/orders',
      headers: as(shopper.customerId),
      payload: { addressId: shopper.addressId, payment: { method: 'cod' }, expectedTotalPaise: 1 },
    });
    expect(missing.statusCode).toBe(400);
  });

  it("D-71: COD where the pincode doesn't allow it is refused", async () => {
    const { app } = setup();
    const item = await insertSellable(db, { codAllowed: false });
    const shopper = await shopperWith(item.key);
    const res = await place(app, shopper, { method: 'cod' });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('PAYMENT_METHOD_NOT_ALLOWED');
  });

  it('D-74: outside demo mode there is no gateway, so prepaid orders are refused', async () => {
    const { app } = setup(false);
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const res = await place(app, shopper, { method: 'upi' });
    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe('PAYMENT_UNAVAILABLE');
    expect(await reserved(item.variantId)).toBe(0);
  });

  it('D-203: parallel orders never reserve more than is on hand', async () => {
    const { app } = setup();
    const item = await insertSellable(db, { stock: { blr: 2 } });
    const shoppers = await Promise.all(Array.from({ length: 6 }, () => shopperWith(item.key)));
    const results = await Promise.all(shoppers.map((s) => place(app, s, { method: 'cod' })));
    // Exactly two win. A loser is refused while reserving (409) or, if the others already
    // reserved when it priced the cart, because nothing is left to deliver (422).
    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(2);
    for (const r of results.filter((r) => r.statusCode !== 200))
      expect(r.json().error.code).toMatch(/OUT_OF_STOCK|CART_NEEDS_ATTENTION|NOT_DELIVERABLE/);
    expect(await reserved(item.variantId)).toBe(2);
  });

  it('D-203: a line ships from the fastest warehouse that has it', async () => {
    const { app } = setup();
    // Bengaluru is fastest to 560034 but has none; Mumbai and Gurugram do.
    const item = await insertSellable(db, { stock: { blr: 0, bhw: 1, ggn: 1 } });
    const shopper = await shopperWith(item.key);
    expect((await place(app, shopper, { method: 'cod' })).statusCode).toBe(200);
    expect(await reserved(item.variantId, 'bhw')).toBe(1);
    expect(await reserved(item.variantId, 'ggn')).toBe(0);
  });
});

describe('paying', () => {
  it('D-56: prepaid orders hold stock for exactly 5 minutes from payment start', async () => {
    const { app } = setup();
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const order = orderViewSchema.parse((await place(app, shopper, { method: 'upi' })).json());
    expect(order.status).toBe('pending_payment');
    expect(order.holdExpiresAt).toBe(TEST_NOW.getTime() + FIVE_MIN);
    expect(order.payment.attemptId).not.toBeNull();
    expect(order.invoiceNumber).toBeNull();
    expect(await reserved(item.variantId)).toBe(1);
  });

  it('D-213: paying on the mock gateway confirms the order and issues the invoice PDF (D-173)', async () => {
    const { app } = setup();
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const order = orderViewSchema.parse((await place(app, shopper, { method: 'upi' })).json());
    const paid = await app.inject({
      method: 'POST',
      url: `/me/orders/${order.id}/payments/${order.payment.attemptId}/mock`,
      headers: as(shopper.customerId),
      payload: { result: 'success' },
    });
    const view = orderViewSchema.parse(paid.json());
    expect(view.status).toBe('confirmed');
    expect(view.holdExpiresAt).toBeNull();
    const holds = await db.select().from(stockHold).where(eq(stockHold.orderId, order.id));
    expect(holds.map((h) => h.status)).toEqual(['converted']);

    const pdf = await app.inject({
      method: 'GET',
      url: `/me/orders/${order.id}/invoice`,
      headers: as(shopper.customerId),
    });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.body.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.body).toContain(view.invoiceNumber!);
    expect(pdf.body).toContain('DEMO INVOICE');
    // Same state (Karnataka warehouse, Karnataka address): CGST + SGST.
    expect(pdf.body).toContain('CGST');
  });

  it('D-204: a failed payment keeps the hold; a retry ends when the hold ends', async () => {
    const { app, advance } = setup();
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const order = orderViewSchema.parse((await place(app, shopper, { method: 'card' })).json());
    const failed = orderViewSchema.parse(
      (
        await app.inject({
          method: 'POST',
          url: `/me/orders/${order.id}/payments/${order.payment.attemptId}/mock`,
          headers: as(shopper.customerId),
          payload: { result: 'failure' },
        })
      ).json(),
    );
    expect(failed).toMatchObject({ status: 'pending_payment', notice: 'PAYMENT_FAILED' });
    expect(failed.payment.attemptId).toBeNull();
    expect(failed.holdExpiresAt).toBe(order.holdExpiresAt);

    advance(60_000);
    const retry = orderViewSchema.parse(
      (
        await app.inject({
          method: 'POST',
          url: `/me/orders/${order.id}/payments`,
          headers: as(shopper.customerId),
        })
      ).json(),
    );
    expect(retry.payment.attemptId).not.toBe(order.payment.attemptId);
    expect(retry.holdExpiresAt).toBe(order.holdExpiresAt);
    expect(retry.notice).toBeNull();
  });

  it('D-57: when the hold runs out the order is cancelled and the stock goes back', async () => {
    const { app, advance } = setup();
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const order = orderViewSchema.parse((await place(app, shopper, { method: 'upi' })).json());
    advance(FIVE_MIN - 1);
    const still = await app.inject({
      method: 'GET',
      url: `/me/orders/${order.id}`,
      headers: as(shopper.customerId),
    });
    expect(still.json().status).toBe('pending_payment');
    advance(1);
    const gone = orderViewSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/me/orders/${order.id}`,
          headers: as(shopper.customerId),
        })
      ).json(),
    );
    expect(gone).toMatchObject({
      status: 'cancelled',
      notice: 'HOLD_EXPIRED',
      holdExpiresAt: null,
    });
    expect(await reserved(item.variantId)).toBe(0);
    const closed = await app.inject({
      method: 'POST',
      url: `/me/orders/${order.id}/payments/${order.payment.attemptId}/mock`,
      headers: as(shopper.customerId),
      payload: { result: 'success' },
    });
    expect(closed.statusCode).toBe(409);
    // The cart keeps its lines: nothing was bought.
    const cart = await app.inject({
      method: 'GET',
      url: '/me/cart',
      headers: as(shopper.customerId),
    });
    expect(cart.json().lines).toHaveLength(1);
  });

  it('D-59: a payment after the hold confirms when a unit is still free', async () => {
    const { app, deps, advance } = setup();
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const order = orderViewSchema.parse((await place(app, shopper, { method: 'upi' })).json());
    advance(FIVE_MIN + 10_000);
    await deps.orders.paymentSucceeded(shopper.customerId, order.id, order.payment.attemptId!);
    const view = orderViewSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/me/orders/${order.id}`,
          headers: as(shopper.customerId),
        })
      ).json(),
    );
    expect(view).toMatchObject({ status: 'confirmed', notice: 'CONFIRMED_AFTER_EXPIRY' });
    expect(await reserved(item.variantId)).toBe(1);
    // A repeated callback changes nothing.
    await deps.orders.paymentSucceeded(shopper.customerId, order.id, order.payment.attemptId!);
    expect(await reserved(item.variantId)).toBe(1);
  });

  it('D-59: a payment after the hold is refunded in full when the unit has gone, and we say so', async () => {
    const { app, deps, advance } = setup();
    const item = await insertSellable(db, { stock: { blr: 1 } });
    const late = await shopperWith(item.key);
    const order = orderViewSchema.parse((await place(app, late, { method: 'upi' })).json());
    advance(FIVE_MIN);
    // The hold-expiry job runs (pg-boss in the app) and the unit goes back to stock...
    await deps.orders.expire(late.customerId, order.id);
    expect(await reserved(item.variantId)).toBe(0);
    // ...and someone else buys it.
    const other = await shopperWith(item.key);
    expect((await place(app, other, { method: 'cod' })).statusCode).toBe(200);
    advance(10_000);
    await deps.orders.paymentSucceeded(late.customerId, order.id, order.payment.attemptId!);
    const view = orderViewSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/me/orders/${order.id}`,
          headers: as(late.customerId),
        })
      ).json(),
    );
    expect(view).toMatchObject({ status: 'refunded', notice: 'REFUNDED_AFTER_EXPIRY' });
    expect(await reserved(item.variantId)).toBe(1);
    const inbox = await db
      .select()
      .from(notification)
      .where(eq(notification.customerId, late.customerId));
    expect(inbox.map((n) => n.kind).sort()).toEqual(['order_cancelled', 'order_refunded']);
  });

  it('D-212: a payment timed inside the hold, settled after the expiry job sold the unit, is refunded', async () => {
    const { app, deps, advance } = setup();
    const item = await insertSellable(db, { stock: { blr: 1 } });
    const late = await shopperWith(item.key);
    const order = orderViewSchema.parse((await place(app, late, { method: 'upi' })).json());
    advance(FIVE_MIN);
    await deps.orders.expire(late.customerId, order.id);
    const other = await shopperWith(item.key);
    expect((await place(app, other, { method: 'cod' })).statusCode).toBe(200);
    // The gateway's success carries a time just inside the hold.
    advance(-1_000);
    await deps.orders.paymentSucceeded(late.customerId, order.id, order.payment.attemptId!);
    const view = orderViewSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/me/orders/${order.id}`,
          headers: as(late.customerId),
        })
      ).json(),
    );
    expect(view.status).toBe('refunded');
    expect(await reserved(item.variantId)).toBe(1);
  });

  it('D-207: units added to the cart during the hold stay after confirmation', async () => {
    const { app } = setup();
    const item = await insertSellable(db, { stock: { blr: 5 } });
    const shopper = await shopperWith(item.key, 1);
    const order = orderViewSchema.parse((await place(app, shopper, { method: 'upi' })).json());
    await changeCart(shopper.customerId, db, () => ({
      entries: [{ key: item.key, qty: 3 }],
      couponCode: undefined,
    }));
    await app.inject({
      method: 'POST',
      url: `/me/orders/${order.id}/payments/${order.payment.attemptId}/mock`,
      headers: as(shopper.customerId),
      payload: { result: 'success' },
    });
    const cart = await app.inject({
      method: 'GET',
      url: '/me/cart',
      headers: as(shopper.customerId),
    });
    expect(cart.json().lines.map((l: { qty: number }) => l.qty)).toEqual([2]);
  });

  it('D-213: the mock gateway exists only in demo mode', async () => {
    const { app } = setup(false);
    const res = await app.inject({
      method: 'POST',
      url: `/me/orders/${seedId('x', '1')}/payments/${seedId('x', '2')}/mock`,
      headers: as((await insertShopper(db)).customerId),
      payload: { result: 'success' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('flash sales at checkout', () => {
  it('D-142: one flash unit per customer; a second order of the sale is refused', async () => {
    const { app } = setup();
    const item = await insertSellable(db, {
      stock: { blr: 5 },
      pricePaise: 300_000,
      flash: { salePricePaise: 250_000, cap: 10, endsAt: new Date(TEST_NOW.getTime() + 3_600_000) },
      now: TEST_NOW,
    });
    const shopper = await shopperWith(item.key, 2);
    const first = orderViewSchema.parse((await place(app, shopper, { method: 'upi' })).json());
    expect(first.items.map((i) => [i.unitPricePaise, i.qty, i.isFlash])).toEqual([
      [300_000, 1, false],
      [250_000, 1, true],
    ]);
    // Same customer, new cart with the sale item again.
    await changeCart(shopper.customerId, db, () => ({
      entries: [{ key: item.key, qty: 1 }],
      couponCode: undefined,
    }));
    const second = await place(app, shopper, { method: 'upi' });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('FLASH_LIMIT_REACHED');
  });

  it('D-71: no COD while a flash sale is live in the order', async () => {
    const { app } = setup();
    const item = await insertSellable(db, {
      flash: { salePricePaise: 100_000, cap: 5, endsAt: new Date(TEST_NOW.getTime() + 3_600_000) },
      now: TEST_NOW,
    });
    const shopper = await shopperWith(item.key);
    const res = await place(app, shopper, { method: 'cod' });
    expect(res.statusCode).toBe(422);
  });
});

describe('invoices', () => {
  it('404 while an order has none', async () => {
    const { app } = setup();
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const order = orderViewSchema.parse((await place(app, shopper, { method: 'upi' })).json());
    const res = await app.inject({
      method: 'GET',
      url: `/me/orders/${order.id}/invoice`,
      headers: as(shopper.customerId),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('INVOICE_NOT_FOUND');
  });
});

describe('background jobs', () => {
  it('D-57: placing schedules the hold expiry; a late mock success is scheduled after it (D-213)', async () => {
    const scheduled: [string, unknown, number][] = [];
    const jobs: OrderJobs = {
      holdExpiry: async (job, at) => void scheduled.push(['holdExpiry', job, at]),
      latePayment: async (job, at) => void scheduled.push(['latePayment', job, at]),
    };
    const { app } = setup(true, jobs);
    const item = await insertSellable(db);
    const shopper = await shopperWith(item.key);
    const order = orderViewSchema.parse((await place(app, shopper, { method: 'upi' })).json());
    await app.inject({
      method: 'POST',
      url: `/me/orders/${order.id}/payments/${order.payment.attemptId}/mock`,
      headers: as(shopper.customerId),
      payload: { result: 'lateSuccess' },
    });
    const job = { customerId: shopper.customerId, orderId: order.id };
    expect(scheduled).toEqual([
      ['holdExpiry', job, order.holdExpiresAt],
      [
        'latePayment',
        { ...job, attemptId: order.payment.attemptId },
        order.holdExpiresAt! + LATE_PAYMENT_DELAY_MS,
      ],
    ]);
  });
});
