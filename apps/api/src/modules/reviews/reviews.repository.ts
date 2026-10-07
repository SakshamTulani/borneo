import { and, desc, eq, sql } from 'drizzle-orm';
import type { CustomerId } from '@borneo/shared';
import type { Db } from '../../db/client';
import { order, orderItem, product, review, user, variant } from '../../db/schema/index';

// Customer-scoped (ADR-0005): reviews are read and written only as their author.

/** The customer's own reviews, newest first, one keyset page (`limit + 1` rows). */
export async function listMyReviews(
  customerId: CustomerId,
  db: Db,
  page: { limit: number; after?: { at: Date; id: string } } = { limit: 50 },
) {
  return db
    .select({
      review,
      productName: product.name,
      slug: product.slug,
    })
    .from(review)
    .innerJoin(product, eq(product.id, review.productId))
    .where(
      and(
        eq(review.customerId, customerId),
        page.after
          ? sql`(${review.createdAt}, ${review.id}) < (${page.after.at}, ${page.after.id})`
          : undefined,
      ),
    )
    .orderBy(desc(review.createdAt), desc(review.id))
    .limit(page.limit + 1);
}

/** Every product the customer has reviewed (one review per product, D-221). */
export async function listReviewedProductIds(customerId: CustomerId, db: Db): Promise<Set<string>> {
  const rows = await db
    .select({ productId: review.productId })
    .from(review)
    .where(eq(review.customerId, customerId));
  return new Set(rows.map((r) => r.productId));
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
