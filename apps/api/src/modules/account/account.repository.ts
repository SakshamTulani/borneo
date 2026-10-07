import { eq } from 'drizzle-orm';
import type { CustomerId } from '@borneo/shared';
import type { Db } from '../../db/client';
import { user } from '../../db/schema/index';

// Customer-scoped (ADR-0005): only the signed-in customer's own row.

/** When the customer's account was created, for the overview. */
export async function findMemberSince(customerId: CustomerId, db: Db): Promise<Date | undefined> {
  const [row] = await db
    .select({ createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, customerId));
  return row?.createdAt;
}
