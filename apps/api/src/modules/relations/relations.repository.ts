import { inArray } from 'drizzle-orm';
import {
  relationRuleSchema,
  type ProductRef,
  type RelationEdge,
  type RelationOverride,
  type RelationRule,
} from '@borneo/shared';
import type { Db } from '../../db/client';
import { product, relation, relationOverride, relationRule } from '../../db/schema/index';

export type RelationInputs = {
  products: ProductRef[];
  rules: RelationRule[];
  overrides: RelationOverride[];
};

/** Everything the materialiser reads. Drafts are excluded; discontinued products keep edges (D-17). */
export async function loadRelationInputs(db: Db): Promise<RelationInputs> {
  const [products, rules, overrides] = await Promise.all([
    db
      .select({
        id: product.id,
        name: product.name,
        categoryId: product.categoryId,
        lineId: product.lineId,
        generation: product.generation,
        familyTier: product.familyTier,
        attributes: product.attributes,
      })
      .from(product)
      .where(inArray(product.status, ['live', 'preorder', 'discontinued'])),
    db.select().from(relationRule),
    db.select().from(relationOverride),
  ]);
  return {
    products,
    // jsonb `match` is parsed, not trusted.
    rules: rules.map((r) => relationRuleSchema.parse(r)),
    overrides: overrides.map((o) => ({
      fromProductId: o.fromProductId,
      toProductId: o.toProductId,
      type: o.type,
      action: o.action,
      ...(o.reason ? { reason: o.reason } : {}),
    })),
  };
}

/** Replaces the materialised table atomically: readers see the old set or the new one. */
export async function replaceRelations(db: Db, edges: RelationEdge[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(relation);
    if (edges.length > 0) await tx.insert(relation).values(edges);
  });
}
