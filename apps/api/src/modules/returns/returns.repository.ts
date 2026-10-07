import { and, desc, eq, sql } from 'drizzle-orm';
import type { CustomerId } from '@borneo/shared';
import type { Db } from '../../db/client';
import {
  order,
  orderItem,
  payment,
  refund,
  returnPhoto,
  returnRequest,
} from '../../db/schema/index';

// Customer-scoped (ADR-0005): every query filters on customer_id, directly or through the order.

/** The order line a request is about, if it is this customer's (D-217). */
export async function findReturnTarget(
  customerId: CustomerId,
  db: Db,
  orderId: string,
  orderItemId: string,
) {
  const [row] = await db
    .select({
      item: orderItem,
      orderNumber: order.number,
      status: order.status,
      deliveredAt: order.deliveredAt,
      paymentMethod: order.paymentMethod,
      hasOpenRequest: sql<boolean>`exists (select 1 from ${returnRequest} where ${returnRequest.orderItemId} = ${orderItem.id} and ${returnRequest.status} <> 'rejected')`,
    })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(
      and(eq(order.customerId, customerId), eq(order.id, orderId), eq(orderItem.id, orderItemId)),
    );
  return row;
}

export type NewReturnRequest = {
  orderItemId: string;
  kind: 'return' | 'replacement';
  reason: 'defect' | 'damage' | 'changedMind' | 'other';
  details: string | null;
  photos: { id: string; contentType: string; bytes: Buffer }[];
  now: Date;
};

/**
 * Stores a request and its photos in one transaction (D-217, D-218). Null when the line already
 * has an open request (the partial unique index decides, so two parallel requests make one).
 */
export async function createReturnRequest(
  customerId: CustomerId,
  db: Db,
  input: NewReturnRequest,
): Promise<string | null> {
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(returnRequest)
        .values({
          orderItemId: input.orderItemId,
          customerId,
          kind: input.kind,
          reason: input.reason,
          details: input.details,
          photoKeys: input.photos.map((p) => p.id),
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning({ id: returnRequest.id });
      if (input.photos.length)
        await tx.insert(returnPhoto).values(
          input.photos.map((p) => ({
            id: p.id,
            returnRequestId: created!.id,
            customerId,
            contentType: p.contentType,
            bytes: p.bytes,
            createdAt: input.now,
          })),
        );
      return created!.id;
    });
  } catch (e) {
    const code = (e as { code?: string; cause?: { code?: string } }).cause?.code;
    if (code === '23505' || (e as { code?: string }).code === '23505') return null;
    throw e;
  }
}

const returnColumns = {
  request: returnRequest,
  orderId: order.id,
  orderNumber: order.number,
  paymentMethod: order.paymentMethod,
  productName: orderItem.productName,
  item: orderItem,
  refundPaise: sql<
    number | null
  >`(select sum(${refund.amountPaise})::bigint from ${refund} where ${refund.returnRequestId} = ${returnRequest.id})`.mapWith(
    (v: string | null) => (v === null ? null : Number(v)),
  ),
};

/** The customer's requests, newest first, one keyset page (`limit + 1` rows to tell if more). */
export async function listReturns(
  customerId: CustomerId,
  db: Db,
  page: { limit: number; after?: { at: Date; id: string } } = { limit: 50 },
) {
  return db
    .select(returnColumns)
    .from(returnRequest)
    .innerJoin(orderItem, eq(orderItem.id, returnRequest.orderItemId))
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(
      and(
        eq(returnRequest.customerId, customerId),
        eq(order.customerId, customerId),
        page.after
          ? sql`(${returnRequest.createdAt}, ${returnRequest.id}) < (${page.after.at}, ${page.after.id})`
          : undefined,
      ),
    )
    .orderBy(desc(returnRequest.createdAt), desc(returnRequest.id))
    .limit(page.limit + 1);
}

export type ReturnRecord = Awaited<ReturnType<typeof listReturns>>[number];

export async function findReturn(
  customerId: CustomerId,
  db: Db,
  id: string,
): Promise<ReturnRecord | undefined> {
  const [row] = await db
    .select(returnColumns)
    .from(returnRequest)
    .innerJoin(orderItem, eq(orderItem.id, returnRequest.orderItemId))
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(and(eq(returnRequest.customerId, customerId), eq(returnRequest.id, id)));
  return row;
}

/** One photo of the customer's own request (D-218). */
export async function findReturnPhoto(
  customerId: CustomerId,
  db: Db,
  returnId: string,
  photoId: string,
) {
  const [row] = await db
    .select({ contentType: returnPhoto.contentType, bytes: returnPhoto.bytes })
    .from(returnPhoto)
    .where(
      and(
        eq(returnPhoto.customerId, customerId),
        eq(returnPhoto.returnRequestId, returnId),
        eq(returnPhoto.id, photoId),
      ),
    );
  return row;
}

/**
 * Moves a request one step (D-219), only from the status the caller saw. Completing with a
 * refund records it against the order's successful payment.
 */
export async function advanceReturn(
  customerId: CustomerId,
  db: Db,
  input: {
    id: string;
    from: 'requested' | 'approved' | 'rejected' | 'completed';
    to: 'requested' | 'approved' | 'rejected' | 'completed';
    refundPaise: number;
    at: Date;
  },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const moved = await tx
      .update(returnRequest)
      .set({ status: input.to, updatedAt: input.at })
      .where(
        and(
          eq(returnRequest.customerId, customerId),
          eq(returnRequest.id, input.id),
          eq(returnRequest.status, input.from),
        ),
      )
      .returning({ orderItemId: returnRequest.orderItemId });
    if (moved.length === 0) return false;
    if (input.refundPaise > 0) {
      const [paid] = await tx
        .select({ id: payment.id, orderId: payment.orderId })
        .from(payment)
        .innerJoin(orderItem, eq(orderItem.orderId, payment.orderId))
        .where(and(eq(orderItem.id, moved[0]!.orderItemId), eq(payment.status, 'succeeded')))
        .limit(1);
      if (paid)
        await tx.insert(refund).values({
          orderId: paid.orderId,
          paymentId: paid.id,
          returnRequestId: input.id,
          amountPaise: input.refundPaise,
          reason: 'Return received (D-219).',
          status: 'processed',
          createdAt: input.at,
        });
    }
    return true;
  });
}

/** Requests not yet finished, for the account overview. */
export async function countOpenReturns(customerId: CustomerId, db: Db): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(returnRequest)
    .where(
      and(
        eq(returnRequest.customerId, customerId),
        sql`${returnRequest.status} in ('requested', 'approved')`,
      ),
    );
  return row?.n ?? 0;
}
