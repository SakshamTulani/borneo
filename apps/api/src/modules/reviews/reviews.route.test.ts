import { myReviewsSchema, type CustomerId } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import {
  headerSession,
  insertBuyer,
  insertDeliveredOrder,
  insertSellable,
  placeViaApi,
} from '../../test/factories';

// Places orders of products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const app = testApp(db, { session: headerSession, demoMode: true });
const as = (customerId: CustomerId) => ({ 'x-test-customer': customerId });

const mine = async (customerId: CustomerId) =>
  myReviewsSchema.parse(
    (await app.inject({ method: 'GET', url: '/me/reviews', headers: as(customerId) })).json(),
  );
const write = (customerId: CustomerId, payload: object) =>
  app.inject({ method: 'POST', url: '/me/reviews', headers: as(customerId), payload });

describe('reviews in the account', () => {
  it('needs a session', async () => {
    expect((await app.inject({ method: 'GET', url: '/me/reviews' })).statusCode).toBe(401);
  });

  it('D-221: a delivered product is prompted for review', async () => {
    const { shopper, order } = await insertDeliveredOrder(app, db);
    const view = await mine(shopper.customerId);
    expect(view.reviews).toEqual([]);
    expect(view.prompts).toEqual([
      expect.objectContaining({
        orderItemId: order.items[0]!.id,
        productName: order.items[0]!.name,
        slug: order.items[0]!.slug,
        deliveredAt: TEST_NOW.getTime(),
      }),
    ]);
  });

  it('D-150: an undelivered line is not prompted and is 422 NOT_DELIVERED', async () => {
    const item = await insertSellable(db);
    const shopper = await insertBuyer(db, item.key);
    const order = await placeViaApi(app, shopper, 'cod');
    expect((await mine(shopper.customerId)).prompts).toEqual([]);
    const res = await write(shopper.customerId, { orderItemId: order.items[0]!.id, rating: 5 });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('NOT_DELIVERED');
  });

  it('D-221: writing a review signs it "First L." and ends the prompt (D-150)', async () => {
    const { shopper, order } = await insertDeliveredOrder(app, db);
    const res = await write(shopper.customerId, {
      orderItemId: order.items[0]!.id,
      rating: 4,
      title: '  Solid  ',
      body: 'Works well every day.',
    });
    expect(res.statusCode).toBe(201);
    const view = myReviewsSchema.parse(res.json());
    expect(view.prompts).toEqual([]);
    expect(view.reviews).toEqual([
      expect.objectContaining({
        rating: 4,
        title: 'Solid',
        body: 'Works well every day.',
        // insertShopper names the customer "Asha Rao".
        authorName: 'Asha R.',
        productName: order.items[0]!.name,
        createdAt: TEST_NOW.getTime(),
      }),
    ]);
  });

  it('D-221: one review per product, even when bought twice (409 ALREADY_REVIEWED)', async () => {
    const first = await insertDeliveredOrder(app, db);
    const second = await insertDeliveredOrder(app, db, {
      shopper: first.shopper,
      sku: first.item.sku,
    });
    // Two deliveries of one product make one prompt.
    expect((await mine(first.shopper.customerId)).prompts).toHaveLength(1);
    const ok = await write(first.shopper.customerId, {
      orderItemId: first.order.items[0]!.id,
      rating: 5,
    });
    expect(ok.statusCode).toBe(201);
    const again = await write(first.shopper.customerId, {
      orderItemId: second.order.items[0]!.id,
      rating: 3,
    });
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('ALREADY_REVIEWED');
    expect((await mine(first.shopper.customerId)).reviews).toHaveLength(1);
  });

  it('D-221: a rating outside 1–5 is 400', async () => {
    const { shopper, order } = await insertDeliveredOrder(app, db);
    const res = await write(shopper.customerId, { orderItemId: order.items[0]!.id, rating: 6 });
    expect(res.statusCode).toBe(400);
  });

  it('an unknown line is 404', async () => {
    const { shopper } = await insertDeliveredOrder(app, db);
    const res = await write(shopper.customerId, { orderItemId: crypto.randomUUID(), rating: 5 });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('ORDER_ITEM_NOT_FOUND');
  });
});
