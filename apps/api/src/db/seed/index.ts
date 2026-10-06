import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import * as schema from '../schema/index';
import { buildSeed } from './build';

export { buildSeed, seedData, seedIssues, type SeedData, type SeedRows } from './build';
export { seedId } from './ids';

/** Loads the seed catalog into an empty, migrated database in one transaction. FK order. */
export async function seedDatabase(db: Db, now: Date): Promise<void> {
  const r = buildSeed(now);
  await db.transaction(async (tx) => {
    await tx.insert(schema.category).values(r.category);
    await tx.insert(schema.attributeDef).values(r.attributeDef);
    await tx.insert(schema.productLine).values(r.productLine);
    await tx.insert(schema.product).values(r.product);
    await tx.insert(schema.variant).values(r.variant);
    await tx.insert(schema.media).values(r.media);
    await tx.insert(schema.faq).values(r.faq);
    await tx.insert(schema.searchSynonym).values(r.searchSynonym);
    await tx.insert(schema.relationRule).values(r.relationRule);
    await tx.insert(schema.relationOverride).values(r.relationOverride);
    await tx.insert(schema.bundle).values(r.bundle);
    await tx.insert(schema.bundleItem).values(r.bundleItem);
    await tx.insert(schema.offer).values(r.offer);
    await tx.insert(schema.emiPlan).values(r.emiPlan);
    await tx.insert(schema.flashSale).values(r.flashSale);
    await tx.insert(schema.disposableDomain).values(r.disposableDomain);
    await tx.insert(schema.warehouse).values(r.warehouse);
    await tx.insert(schema.inventory).values(r.inventory);
    await tx.insert(schema.serviceability).values(r.serviceability);
    await tx.insert(schema.deliveryLane).values(r.deliveryLane);
    await tx.insert(schema.pincodeArea).values(r.pincodeArea);
    // Demo reviews and the delivered demo orders behind them (D-200).
    await tx.insert(schema.user).values(r.user);
    await tx.insert(schema.order).values(r.order);
    await tx.insert(schema.orderItem).values(r.orderItem);
    await tx.insert(schema.review).values(r.review);
  });
  await db.execute(sql`analyze`);
}
