import { asc, eq, inArray } from 'drizzle-orm';
import { bundleKey, itemKey, parseLineKey, type CartEntry, type CustomerId } from '@borneo/shared';
import type { Db } from '../../db/client';
import { bundle, cart, cartItem, variant } from '../../db/schema/index';

// Customer-scoped (ADR-0005): every query below filters on customer_id.

export type StoredCart = { entries: CartEntry[]; couponCode: string | undefined };

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

async function readLines(tx: Db | Tx, cartId: string): Promise<CartEntry[]> {
  const rows = await tx
    .select({ qty: cartItem.qty, sku: variant.sku, slug: bundle.slug })
    .from(cartItem)
    .leftJoin(variant, eq(variant.id, cartItem.variantId))
    .leftJoin(bundle, eq(bundle.id, cartItem.bundleId))
    .where(eq(cartItem.cartId, cartId))
    .orderBy(asc(cartItem.createdAt), asc(cartItem.id));
  return rows.map((r) => ({ key: r.sku ? itemKey(r.sku) : bundleKey(r.slug!), qty: r.qty }));
}

/** The customer's saved cart; empty when they have none yet. */
export async function readCart(customerId: CustomerId, db: Db): Promise<StoredCart> {
  const [row] = await db.select().from(cart).where(eq(cart.customerId, customerId));
  if (!row) return { entries: [], couponCode: undefined };
  return { entries: await readLines(db, row.id), couponCode: row.couponCode ?? undefined };
}

/**
 * Changes the customer's cart in one transaction under a lock on their cart row, so parallel
 * writes can't lose a line or pass the limits (D-193). `change` (the service's rules) gets the
 * current cart and returns the new one, or throws to change nothing. Lines keep the time they were
 * first added; keys that no longer name a variant or bundle are dropped.
 */
export async function changeCart(
  customerId: CustomerId,
  db: Db,
  change: (current: StoredCart) => StoredCart | Promise<StoredCart>,
): Promise<StoredCart> {
  return db.transaction(async (tx) => {
    await tx.insert(cart).values({ customerId }).onConflictDoNothing({ target: cart.customerId });
    const [row] = await tx.select().from(cart).where(eq(cart.customerId, customerId)).for('update');
    const current = {
      entries: await readLines(tx, row!.id),
      couponCode: row!.couponCode ?? undefined,
    };
    const next = await change(current);

    const refs = next.entries.map((e) => parseLineKey(e.key)!);
    const skus = refs.flatMap((r) => (r.kind === 'item' ? [r.sku] : []));
    const slugs = refs.flatMap((r) => (r.kind === 'bundle' ? [r.slug] : []));
    const [variants, bundles] = await Promise.all([
      skus.length
        ? tx
            .select({ id: variant.id, sku: variant.sku })
            .from(variant)
            .where(inArray(variant.sku, skus))
        : [],
      slugs.length
        ? tx
            .select({ id: bundle.id, slug: bundle.slug })
            .from(bundle)
            .where(inArray(bundle.slug, slugs))
        : [],
    ]);
    const variantId = new Map(variants.map((v) => [itemKey(v.sku), v.id]));
    const bundleId = new Map(bundles.map((b) => [bundleKey(b.slug), b.id]));
    const kept = next.entries.filter((e) => variantId.has(e.key) || bundleId.has(e.key));

    const existing = await tx
      .select({ id: cartItem.id, variantId: cartItem.variantId, bundleId: cartItem.bundleId })
      .from(cartItem)
      .where(eq(cartItem.cartId, row!.id));
    const idOf = (e: { variantId: string | null; bundleId: string | null }) =>
      e.variantId ?? e.bundleId!;
    const wanted = new Map(kept.map((e) => [variantId.get(e.key) ?? bundleId.get(e.key)!, e]));
    const gone = existing.filter((e) => !wanted.has(idOf(e))).map((e) => e.id);
    if (gone.length) await tx.delete(cartItem).where(inArray(cartItem.id, gone));
    for (const e of kept) {
      const values = {
        cartId: row!.id,
        variantId: variantId.get(e.key) ?? null,
        bundleId: bundleId.get(e.key) ?? null,
        qty: e.qty,
      };
      await tx
        .insert(cartItem)
        .values(values)
        .onConflictDoUpdate({
          target: [cartItem.cartId, cartItem.variantId, cartItem.bundleId],
          set: { qty: e.qty },
        });
    }
    await tx
      .update(cart)
      .set({ couponCode: next.couponCode ?? null, updatedAt: new Date() })
      .where(eq(cart.id, row!.id));
    return { entries: kept, couponCode: next.couponCode };
  });
}
