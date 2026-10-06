import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import type { Db } from '../../db/client';
import { product } from '../../db/schema/index';
import { useTestDb } from '../../test/db';
import { findCategoryBySlug, findProductBySlug, listProducts } from './catalog.repository';

const db = useTestDb();

/** Runs `fn` in a transaction that is always rolled back: seeded rows stay untouched. */
async function rolledBack(fn: (tx: Db) => Promise<void>) {
  const rollback = new Error('rollback');
  await db
    .transaction(async (tx) => {
      await fn(tx as unknown as Db);
      throw rollback;
    })
    .catch((e: unknown) => {
      if (e !== rollback) throw e;
    });
}

describe('catalog repository', () => {
  it('D-17: draft products have no page and are never listed', async () => {
    await rolledBack(async (tx) => {
      await tx.update(product).set({ status: 'draft' }).where(eq(product.slug, 'pulse-4'));
      expect(await findProductBySlug(tx, 'pulse-4')).toBeUndefined();
      const rows = await listProducts(tx, { filters: [], sort: 'newest', limit: 50 });
      expect(rows.map((r) => r.slug)).not.toContain('pulse-4');
    });
  });

  it('D-18: a list attribute matches when it contains any selected value', async () => {
    const audio = await findCategoryBySlug(db, 'audio');
    const rows = await listProducts(db, {
      categoryId: audio!.category.id,
      filters: [{ key: 'codecs', kind: 'anyOf', values: ['LDAC'] }],
      sort: 'newest',
      limit: 50,
    });
    expect(rows.length).toBeGreaterThan(0);
    const none = await listProducts(db, {
      categoryId: audio!.category.id,
      filters: [{ key: 'codecs', kind: 'anyOf', values: ['NOPE'] }],
      sort: 'newest',
      limit: 50,
    });
    expect(none).toEqual([]);
  });

  it('D-16: attribute definitions carry their option labels', async () => {
    const audio = await findCategoryBySlug(db, 'audio');
    expect(audio!.defs.find((d) => d.key === 'form_factor')?.optionLabels?.tws).toBe(
      'True wireless',
    );
  });
});
