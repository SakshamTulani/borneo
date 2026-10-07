import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { CustomerId } from '@borneo/shared';
import type { Db } from '../../db/client';
import { product, wishlist } from '../../db/schema/index';

// Customer-scoped (ADR-0005): a customer only sees and changes their own wishlist.

/** A product by slug, with whether this customer saved it and how many they have (D-235). */
export async function findWishlistTarget(customerId: CustomerId, db: Db, slug: string) {
  const [row] = await db
    .select({
      id: product.id,
      status: product.status,
      saved: sql<boolean>`exists (select 1 from ${wishlist} where ${wishlist.customerId} = ${customerId} and ${wishlist.productId} = ${product.id})`,
      count: sql<number>`(select count(*)::int from ${wishlist} w join ${product} p on p.id = w.product_id where w.customer_id = ${customerId} and p.status in ('live', 'preorder'))`,
    })
    .from(product)
    .where(eq(product.slug, slug));
  return row;
}

/**
 * Saves one product unless the customer already has `max` products that are still sold, in the
 * same statement, so parallel saves can't pass the cap (D-235). False when full.
 */
export async function addToWishlist(
  customerId: CustomerId,
  db: Db,
  productId: string,
  now: Date,
  max: number,
): Promise<boolean> {
  const result = await db.execute(sql`
    insert into ${wishlist} (customer_id, product_id, created_at)
    select ${customerId}, ${productId}, ${now}
    where (
      select count(*) from ${wishlist} w join ${product} p on p.id = w.product_id
      where w.customer_id = ${customerId} and p.status in ('live', 'preorder')
    ) < ${max}
    on conflict do nothing`);
  return (result.rowCount ?? 0) > 0;
}

export async function removeFromWishlist(customerId: CustomerId, db: Db, productId: string) {
  await db
    .delete(wishlist)
    .where(and(eq(wishlist.customerId, customerId), eq(wishlist.productId, productId)));
}

/** Newest first, one keyset page (`limit + 1` rows), with the total. */
export async function listWishlist(
  customerId: CustomerId,
  db: Db,
  page: { limit: number; after?: { at: Date; id: string } },
) {
  const [rows, [count]] = await Promise.all([
    db
      .select({ productId: wishlist.productId, createdAt: wishlist.createdAt })
      .from(wishlist)
      .innerJoin(product, eq(product.id, wishlist.productId))
      .where(
        and(
          eq(wishlist.customerId, customerId),
          inArray(product.status, ['live', 'preorder']),
          page.after
            ? sql`(${wishlist.createdAt}, ${wishlist.productId}) < (${page.after.at}, ${page.after.id})`
            : undefined,
        ),
      )
      .orderBy(desc(wishlist.createdAt), desc(wishlist.productId))
      .limit(page.limit + 1),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(wishlist)
      .innerJoin(product, eq(product.id, wishlist.productId))
      .where(
        and(eq(wishlist.customerId, customerId), inArray(product.status, ['live', 'preorder'])),
      ),
  ]);
  return { rows, total: count?.n ?? 0 };
}

/** Slugs on the wishlist, for hearts. */
export async function listWishlistSlugs(customerId: CustomerId, db: Db): Promise<string[]> {
  const rows = await db
    .select({ slug: product.slug })
    .from(wishlist)
    .innerJoin(product, eq(product.id, wishlist.productId))
    .where(eq(wishlist.customerId, customerId));
  return rows.map((r) => r.slug);
}
