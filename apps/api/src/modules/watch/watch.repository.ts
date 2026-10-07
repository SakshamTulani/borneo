import { and, desc, eq, sql } from 'drizzle-orm';
import type { CustomerId } from '@borneo/shared';
import type { Db } from '../../db/client';
import { inventory, product, variant, watch } from '../../db/schema/index';

// Customer-scoped (ADR-0005): a customer only sees and changes their own watch list.

const unitsAvailable = sql<number>`coalesce((select sum(${inventory.onHand} - ${inventory.reserved}) from ${inventory} where ${inventory.variantId} = ${variant.id}), 0)::int`;

const variantFacts = {
  variantId: variant.id,
  sku: variant.sku,
  options: variant.options,
  pricePaise: variant.pricePaise,
  preorderCap: variant.preorderCap,
  preorderSold: variant.preorderSold,
  productId: product.id,
  slug: product.slug,
  name: product.name,
  status: product.status,
  unitsAvailable,
};

/** What a variant is now, to decide whether it can be watched (D-147, D-222). */
export async function findWatchTarget(customerId: CustomerId, db: Db, sku: string) {
  const [row] = await db
    .select({
      ...variantFacts,
      watching: sql<boolean>`exists (select 1 from ${watch} where ${watch.customerId} = ${customerId} and ${watch.variantId} = ${variant.id})`,
    })
    .from(variant)
    .innerJoin(product, eq(product.id, variant.productId))
    .where(eq(variant.sku, sku));
  return row;
}

/** The watch list, newest first, with each variant's facts now. */
export async function listWatch(customerId: CustomerId, db: Db) {
  return db
    .select({ ...variantFacts, createdAt: watch.createdAt })
    .from(watch)
    .innerJoin(variant, eq(variant.id, watch.variantId))
    .innerJoin(product, eq(product.id, variant.productId))
    .where(eq(watch.customerId, customerId))
    .orderBy(desc(watch.createdAt));
}

export async function countWatch(customerId: CustomerId, db: Db): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(watch)
    .where(eq(watch.customerId, customerId));
  return row?.n ?? 0;
}

export async function addWatch(customerId: CustomerId, db: Db, variantId: string, now: Date) {
  await db.insert(watch).values({ customerId, variantId, createdAt: now }).onConflictDoNothing();
}

export async function removeWatch(customerId: CustomerId, db: Db, variantId: string) {
  await db
    .delete(watch)
    .where(and(eq(watch.customerId, customerId), eq(watch.variantId, variantId)));
}
