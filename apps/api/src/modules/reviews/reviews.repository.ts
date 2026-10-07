import { and, desc, eq } from 'drizzle-orm';
import type { CustomerId } from '@borneo/shared';
import type { Db } from '../../db/client';
import { order, orderItem, product, review, user, variant } from '../../db/schema/index';

// Customer-scoped (ADR-0005): reviews are read and written only as their author.

/** The customer's own reviews, newest first. */
export async function listMyReviews(customerId: CustomerId, db: Db) {
  return db
    .select({
      review,
      productName: product.name,
      slug: product.slug,
    })
    .from(review)
    .innerJoin(product, eq(product.id, review.productId))
    .where(eq(review.customerId, customerId))
    .orderBy(desc(review.createdAt));
}

/** A delivered line of this customer's, with what a review needs (D-150, D-221). */
export async function findReviewableLine(customerId: CustomerId, db: Db, orderItemId: string) {
  const [row] = await db
    .select({
      productId: product.id,
      status: order.status,
      customerName: user.name,
    })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .innerJoin(variant, eq(variant.id, orderItem.variantId))
    .innerJoin(product, eq(product.id, variant.productId))
    .innerJoin(user, eq(user.id, order.customerId))
    .where(and(eq(order.customerId, customerId), eq(orderItem.id, orderItemId)));
  return row;
}

/** Null when the customer already reviewed this product or line (unique indexes, D-221). */
export async function insertReview(
  customerId: CustomerId,
  db: Db,
  values: {
    productId: string;
    orderItemId: string;
    rating: number;
    authorName: string;
    title: string | null;
    body: string | null;
    now: Date;
  },
): Promise<string | null> {
  const [row] = await db
    .insert(review)
    .values({
      customerId,
      productId: values.productId,
      orderItemId: values.orderItemId,
      rating: values.rating,
      authorName: values.authorName,
      title: values.title,
      body: values.body,
      createdAt: values.now,
    })
    .onConflictDoNothing()
    .returning({ id: review.id });
  return row?.id ?? null;
}
