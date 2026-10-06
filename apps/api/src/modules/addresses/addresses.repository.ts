import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { AddressFields, CustomerId } from '@borneo/shared';
import type { Db } from '../../db/client';
import { address, user } from '../../db/schema/index';

// Customer-scoped (ADR-0005): every query filters on customer_id.

export type AddressRow = typeof address.$inferSelect;
/** What a save writes; `isDefault` is decided by the service (D-188). */
export type AddressValues = Omit<AddressFields, 'isDefault'>;

const mine = (customerId: CustomerId, id: string) =>
  and(eq(address.customerId, customerId), eq(address.id, id));

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Serialises one customer's address-book writes (count limit, one default). */
async function lockBook(customerId: CustomerId, tx: Tx) {
  await tx.execute(sql`select 1 from ${user} where ${user.id} = ${customerId} for update`);
}

/** Default first, then newest. */
export async function listAddresses(customerId: CustomerId, db: Db): Promise<AddressRow[]> {
  return db
    .select()
    .from(address)
    .where(eq(address.customerId, customerId))
    .orderBy(desc(address.isDefault), desc(address.createdAt), desc(address.id));
}

export async function findAddress(
  customerId: CustomerId,
  db: Db,
  id: string,
): Promise<AddressRow | undefined> {
  const [row] = await db.select().from(address).where(mine(customerId, id));
  return row;
}

/**
 * Adds an address. `decide(existing)` (the service's rules) returns whether it becomes the
 * default, or throws; it runs under the customer's lock, so parallel saves can't pass the limit
 * or both become the default (D-188).
 */
export async function insertAddress(
  customerId: CustomerId,
  db: Db,
  values: AddressValues,
  decide: (existing: number) => boolean,
): Promise<AddressRow> {
  return db.transaction(async (tx) => {
    await lockBook(customerId, tx);
    const [row] = await tx
      .select({ n: count() })
      .from(address)
      .where(eq(address.customerId, customerId));
    const isDefault = decide(row?.n ?? 0);
    if (isDefault) {
      await tx.update(address).set({ isDefault: false }).where(eq(address.customerId, customerId));
    }
    const [inserted] = await tx
      .insert(address)
      .values({ ...values, customerId, isDefault })
      .returning();
    return inserted!;
  });
}

export async function updateAddress(
  customerId: CustomerId,
  db: Db,
  id: string,
  values: AddressValues,
): Promise<AddressRow | undefined> {
  const [row] = await db.update(address).set(values).where(mine(customerId, id)).returning();
  return row;
}

/** False when the customer has no such address. */
export async function setDefaultAddress(
  customerId: CustomerId,
  db: Db,
  id: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    await lockBook(customerId, tx);
    const [target] = await tx.select({ id: address.id }).from(address).where(mine(customerId, id));
    if (!target) return false;
    await tx.update(address).set({ isDefault: false }).where(eq(address.customerId, customerId));
    await tx.update(address).set({ isDefault: true }).where(mine(customerId, id));
    return true;
  });
}

/**
 * Deletes an address; if it was the default, `nextDefault` (the service's rule) picks the new one
 * in the same transaction. False when the customer has no such address.
 */
export async function deleteAddress(
  customerId: CustomerId,
  db: Db,
  id: string,
  nextDefault: (remaining: { id: string; createdAt: Date }[]) => string | null,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    await lockBook(customerId, tx);
    const [removed] = await tx.delete(address).where(mine(customerId, id)).returning();
    if (!removed) return false;
    if (removed.isDefault) {
      const remaining = await tx
        .select({ id: address.id, createdAt: address.createdAt })
        .from(address)
        .where(eq(address.customerId, customerId));
      const next = nextDefault(remaining);
      if (next) await tx.update(address).set({ isDefault: true }).where(mine(customerId, next));
    }
    return true;
  });
}
