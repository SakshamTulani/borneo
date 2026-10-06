import { checkoutViewSchema, orderViewSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import { headerSession, insertSellable, insertShopper } from '../../test/factories';
import { changeCart } from '../cart/index';
import { expireHold, findOrder, findOrderIdByKey, startAttempt } from './orders.repository';

// Adds products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const app = testApp(db, { session: headerSession, demoMode: true });
const as = (c: string) => ({ 'x-test-customer': c });

async function ownerOrder() {
  const item = await insertSellable(db);
  const owner = await insertShopper(db);
  const other = await insertShopper(db);
  await changeCart(owner.customerId, db, () => ({
    entries: [{ key: item.key, qty: 1 }],
    couponCode: undefined,
  }));
  const quote = checkoutViewSchema.parse(
    (
      await app.inject({ method: 'GET', url: '/me/checkout', headers: as(owner.customerId) })
    ).json(),
  );
  const res = await app.inject({
    method: 'POST',
    url: '/me/orders',
    headers: { ...as(owner.customerId), 'idempotency-key': `cross-${item.sku}` },
    payload: {
      addressId: owner.addressId,
      payment: { method: 'upi' },
      expectedTotalPaise: quote.totals.totalPaise,
    },
  });
  return { owner, other, order: orderViewSchema.parse(res.json()), key: `cross-${item.sku}` };
}

describe('orders are scoped to their customer (D-96)', () => {
  it("repositories never return or change another customer's order", async () => {
    const { owner, other, order, key } = await ownerOrder();
    expect(await findOrder(other.customerId, db, order.id)).toBeUndefined();
    expect(await findOrderIdByKey(other.customerId, db, key)).toBeUndefined();
    expect(await findOrder(owner.customerId, db, order.id)).toBeDefined();
    const later = new Date(TEST_NOW.getTime() + 600_000);
    expect(await expireHold(other.customerId, db, order.id, later)).toBe(false);
    expect(await startAttempt(other.customerId, db, order.id, later)).toBeNull();
    expect((await findOrder(owner.customerId, db, order.id))!.order.status).toBe('pending_payment');
  });

  it("routes answer 404 for another customer's order, payment and invoice", async () => {
    const { other, order } = await ownerOrder();
    const urls: [string, string][] = [
      ['GET', `/me/orders/${order.id}`],
      ['GET', `/me/orders/${order.id}/invoice`],
      ['POST', `/me/orders/${order.id}/payments`],
    ];
    for (const [method, url] of urls) {
      const res = await app.inject({ method: method as 'GET', url, headers: as(other.customerId) });
      expect(res.statusCode, url).toBe(404);
    }
    const pay = await app.inject({
      method: 'POST',
      url: `/me/orders/${order.id}/payments/${order.payment.attemptId}/mock`,
      headers: as(other.customerId),
      payload: { result: 'success' },
    });
    expect(pay.statusCode).toBe(404);
    const mine = await app.inject({
      method: 'GET',
      url: `/me/checkout?addressId=${order.id}`,
      headers: as(other.customerId),
    });
    expect(mine.statusCode).toBe(404);
  });

  it("checkout never uses another customer's address", async () => {
    const { owner, other } = await ownerOrder();
    const res = await app.inject({
      method: 'GET',
      url: `/me/checkout?addressId=${owner.addressId}`,
      headers: as(other.customerId),
    });
    expect(res.statusCode).toBe(404);
  });
});
