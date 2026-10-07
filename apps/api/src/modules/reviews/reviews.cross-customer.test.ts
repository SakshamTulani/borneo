import { myReviewsSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import { headerSession, insertCustomer, insertDeliveredOrder } from '../../test/factories';
import { findReviewableLine, insertReview, listMyReviews } from './reviews.repository';

// Places orders of products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const app = testApp(db, { session: headerSession, demoMode: true });
const as = (c: string) => ({ 'x-test-customer': c });

async function ownerReviewed() {
  const { shopper, order } = await insertDeliveredOrder(app, db);
  const res = await app.inject({
    method: 'POST',
    url: '/me/reviews',
    headers: as(shopper.customerId),
    payload: { orderItemId: order.items[0]!.id, rating: 5 },
  });
  expect(res.statusCode).toBe(201);
  return { owner: shopper.customerId, other: await insertCustomer(db), order };
}

describe('reviews are written and listed only by their author (D-96, D-150)', () => {
  it("repositories never show another customer's reviews or lines", async () => {
    const { owner, other, order } = await ownerReviewed();
    expect(await listMyReviews(other, db)).toEqual([]);
    expect(await findReviewableLine(other, db, order.items[0]!.id)).toBeUndefined();
    expect(await listMyReviews(owner, db)).toHaveLength(1);
    // Another customer reviewing the same product is a separate review, not a conflict.
    const theirs = await insertDeliveredOrder(app, db, { sku: order.items[0]!.sku });
    const line = await findReviewableLine(theirs.shopper.customerId, db, theirs.order.items[0]!.id);
    expect(
      await insertReview(theirs.shopper.customerId, db, {
        productId: line!.productId,
        orderItemId: theirs.order.items[0]!.id,
        rating: 4,
        authorName: 'Asha R.',
        title: null,
        body: null,
        now: TEST_NOW,
      }),
    ).not.toBeNull();
    expect(await listMyReviews(owner, db)).toHaveLength(1);
  });

  it("routes never review another customer's line or show their prompts", async () => {
    const { other, order } = await ownerReviewed();
    const res = await app.inject({
      method: 'POST',
      url: '/me/reviews',
      headers: as(other),
      payload: { orderItemId: order.items[0]!.id, rating: 1 },
    });
    expect(res.statusCode).toBe(404);
    const mine = await app.inject({ method: 'GET', url: '/me/reviews', headers: as(other) });
    expect(myReviewsSchema.parse(mine.json())).toEqual({
      prompts: [],
      reviews: [],
      nextCursor: null,
    });
  });
});
