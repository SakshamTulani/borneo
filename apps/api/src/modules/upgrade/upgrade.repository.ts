import { and, eq, sql } from 'drizzle-orm';
import type { CustomerId } from '@borneo/shared';
import type { Db } from '../../db/client';
import { category, order, orderItem, product, returnRequest, variant } from '../../db/schema/index';

// Customer-scoped (ADR-0005): only this customer's delivered lines.

/**
 * What the customer owns, for upgrades (D-24, D-130): delivered lines not returned for a refund,
 * with the product's line, generation, tier and the line's return window (D-132).
 */
export async function listOwnedForUpgrade(customerId: CustomerId, db: Db) {
  return db
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      lineId: product.lineId,
      generation: product.generation,
      familyTier: product.familyTier,
      attributes: product.attributes,
      categoryId: product.categoryId,
      categoryDepth: category.depth,
      returnWindowEndsAt: orderItem.returnWindowEndsAt,
    })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .innerJoin(variant, eq(variant.id, orderItem.variantId))
    .innerJoin(product, eq(product.id, variant.productId))
    .innerJoin(category, eq(category.id, product.categoryId))
    .where(
      and(
        eq(order.customerId, customerId),
        eq(order.status, 'delivered'),
        sql`not exists (select 1 from ${returnRequest} where ${returnRequest.orderItemId} = ${orderItem.id} and ${returnRequest.kind} = 'return' and ${returnRequest.status} = 'completed')`,
      ),
    );
}
