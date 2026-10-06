import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { useTestDb } from '../test/db';
import { seedId } from './seed/index';

const db = useTestDb();
const rowsOf = async <T>(q: ReturnType<typeof sql>) => (await db.execute(q)).rows as T[];

/** Runs statements where the last must be rejected; the transaction is rolled back either way. */
async function rejects(...qs: ReturnType<typeof sql>[]): Promise<string> {
  try {
    await db.transaction(async (tx) => {
      for (const q of qs) await tx.execute(q);
      throw new Error('accepted');
    });
  } catch (e) {
    const cause = (e as { cause?: { constraint?: string } }).cause;
    return cause?.constraint ?? (e as Error).message;
  }
  return 'accepted';
}

describe('migrations', () => {
  it('apply every migration in the journal', async () => {
    const journal = JSON.parse(
      readFileSync(new URL('../../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
    ) as { entries: unknown[] };
    const applied = await rowsOf<{ n: number }>(
      sql`select count(*)::int as n from drizzle.__drizzle_migrations`,
    );
    expect(applied[0]!.n).toBe(journal.entries.length);
  });

  it('enable pg_trgm with trigram indexes on name, model number and SKU (ADR-0002)', async () => {
    const ext = await rowsOf(sql`select 1 from pg_extension where extname = 'pg_trgm'`);
    expect(ext).toHaveLength(1);
    const indexes = await rowsOf<{ indexname: string }>(
      sql`select indexname from pg_indexes where indexdef like '%gin_trgm_ops%' order by indexname`,
    );
    expect(indexes.map((i) => i.indexname)).toEqual([
      'product_model_number_trgm',
      'product_name_trgm',
      'variant_sku_trgm',
    ]);
  });
});

describe('constraints', () => {
  // Customer rows reference a Better Auth user.
  beforeAll(async () => {
    await db.execute(
      sql`insert into "user" (id, name, email) values ('c1', 'C1', 'c1@example.com') on conflict do nothing`,
    );
  });

  const pulse4 = seedId('product', 'pulse-4');
  const blr = seedId('warehouse', 'blr');
  const sku = seedId('variant', 'BP4-6-128-FOR');
  const phones = seedId('category', 'smartphones');

  it('D-31: a variant price above MRP is rejected', async () => {
    expect(
      await rejects(
        sql`insert into variant (product_id, sku, mrp_paise, price_paise) values (${pulse4}, 'X-1', 100, 200)`,
      ),
    ).toBe('variant_price_le_mrp');
  });

  it('D-54: reserved stock can never exceed stock on hand', async () => {
    expect(
      await rejects(
        sql`update inventory set reserved = on_hand + 1 where warehouse_id = ${blr} and variant_id = ${sku}`,
      ),
    ).toBe('inventory_bounds');
  });

  it('D-140: flash sales cannot sell past their cap', async () => {
    expect(
      await rejects(
        sql`update flash_sale set sold = cap + 1 where id = ${seedId('flash', 'echo-buds-2-live')}`,
      ),
    ).toBe('flash_sale_sold');
  });

  it('D-22: compatibility attributes cannot be free text', async () => {
    expect(
      await rejects(
        sql`insert into attribute_def (category_id, key, label, type, compat) values (${phones}, 'notes', 'Notes', 'text', true)`,
      ),
    ).toBe('attribute_def_compat_not_text');
  });

  it('D-50: serviceability needs a valid pincode', async () => {
    expect(
      await rejects(sql`insert into serviceability values ('060001', ${phones}, true, true)`),
    ).toBe('serviceability_pincode');
  });

  const orderId = '00000000-0000-4000-8000-000000000001';
  const order = (method: string, preorder: boolean) =>
    sql`insert into "order" (id, customer_id, number, address, subtotal_paise, total_paise, payment_method, is_preorder, idempotency_key)
        values (${orderId}, 'c1', 'T-1', '{}', 100, 100, ${method}, ${preorder}, 'k1')`;

  it('D-71: a pre-order cannot be paid by COD', async () => {
    expect(await rejects(order('cod', true))).toBe('order_preorder_no_cod');
  });

  it('D-39: a cart line cannot take both a bundle and a flash price', async () => {
    const cart = '00000000-0000-4000-8000-000000000002';
    expect(
      await rejects(
        sql`insert into cart (id, customer_id) values (${cart}, 'c1')`,
        sql`insert into cart_item (cart_id, bundle_id, flash_sale_id, qty)
            values (${cart}, ${seedId('bundle', 'pulse-4-audio-pack')}, ${seedId('flash', 'echo-buds-2-live')}, 1)`,
      ),
    ).toBe('cart_item_flash_not_bundle');
  });

  it('D-142: one flash purchase per customer per sale', async () => {
    const sale = seedId('flash', 'echo-buds-2-live');
    expect(
      await rejects(
        order('upi', false),
        sql`insert into flash_purchase values (${sale}, 'c1', ${orderId})`,
        sql`insert into flash_purchase values (${sale}, 'c1', ${orderId})`,
      ),
    ).toBe('flash_purchase_flash_sale_id_customer_id_pk');
  });

  it('D-65: pre-order sales cannot pass the pre-order cap', async () => {
    expect(
      await rejects(
        sql`update variant set preorder_sold = preorder_cap + 1 where sku = 'BN4-12-256-GLA'`,
      ),
    ).toBe('variant_preorder_sold');
  });

  it('D-88: a defect or damage request needs photos', async () => {
    expect(
      await rejects(
        order('upi', false),
        sql`insert into order_item (id, order_id, variant_id, sku, product_name, return_policy, qty, mrp_paise, unit_price_paise)
            values ('00000000-0000-4000-8000-000000000003', ${orderId}, ${sku}, 'BP4-6-128-FOR', 'Borneo Pulse 4', 'replacementOnly', 1, 100, 100)`,
        sql`insert into return_request (order_item_id, customer_id, kind, reason)
            values ('00000000-0000-4000-8000-000000000003', 'c1', 'replacement', 'defect')`,
      ),
    ).toBe('return_request_photos');
  });

  it('D-41: order money cannot be negative', async () => {
    expect(
      await rejects(
        sql`insert into "order" (customer_id, number, address, subtotal_paise, discount_paise, total_paise, payment_method, idempotency_key)
            values ('c1', 'T-2', '{}', 100, -5, 105, 'upi', 'k2')`,
      ),
    ).toBe('order_amounts');
  });
});
