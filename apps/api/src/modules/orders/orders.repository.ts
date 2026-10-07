import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import type { AddressSnapshot, CustomerId, PaymentMethod } from '@borneo/shared';
import type { Db } from '../../db/client';
import {
  bundle,
  category,
  flashPurchase,
  flashSale,
  inventory,
  invoice,
  invoiceNumberSeq,
  offer,
  order,
  orderEvent,
  orderItem,
  orderNumberSeq,
  payment,
  product,
  refund,
  returnRequest,
  shipment,
  stockHold,
  user,
  variant,
  warehouse,
} from '../../db/schema/index';

// Customer-scoped (ADR-0005): every query below filters on customer_id or on an order already
// matched to it. Stock changes are single conditional updates (backend-architecture.md).

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** A reservation that couldn't be made; the whole order rolls back. */
class Conflict extends Error {
  readonly code: ReserveConflict;
  constructor(code: ReserveConflict) {
    super(code);
    this.code = code;
  }
}
export type ReserveConflict = 'OUT_OF_STOCK' | 'FLASH_SOLD_OUT' | 'FLASH_LIMIT_REACHED';

/** One item to store and reserve. `warehouses` is the order to try them in (D-63, D-203). */
export type NewOrderItem = {
  sku: string;
  variantId: string;
  productName: string;
  returnPolicy: 'return' | 'replacementOnly';
  qty: number;
  mrpPaise: number;
  unitPricePaise: number;
  discountPaise: number;
  hsnCode: string | null;
  gstRateBps: number;
  bundleSlug: string | null;
  flashSaleId: string | null;
  isPreorder: boolean;
  warehouses: string[];
  returnWindowEndsAt: null;
};

export type NewOrder = {
  idempotencyKey: string;
  /** The order number for the next value of the sequence (D-208). */
  number: (seq: number) => string;
  address: AddressSnapshot;
  subtotalPaise: number;
  couponDiscountPaise: number;
  paymentDiscountPaise: number;
  totalPaise: number;
  couponOfferId: string | null;
  paymentOfferId: string | null;
  paymentMethod: PaymentMethod;
  paymentBank: string | null;
  emiTenureMonths: number | null;
  isPreorder: boolean;
  etaFrom: string | null;
  etaTo: string | null;
  items: NewOrderItem[];
  /** Prepaid: held until `holdExpiresAt` with a payment attempt (D-56). COD: allocated now (D-205). */
  hold: { kind: 'hold'; expiresAt: Date } | { kind: 'allocate' };
  now: Date;
};

export type PlaceResult =
  | { status: 'created'; orderId: string; attemptId: string | null }
  | { status: 'existing'; orderId: string }
  | { status: 'conflict'; code: ReserveConflict };

/**
 * Reserves one item: pre-orders against the variant's cap (D-65), everything else at the first
 * warehouse in `warehouses` with enough unreserved stock (D-203), and flash units against the
 * sale's cap with the one-per-customer purchase row (D-142). Each step is one conditional update.
 */
async function reserve(
  tx: Tx,
  customerId: CustomerId,
  orderId: string,
  item: Pick<NewOrderItem, 'variantId' | 'qty' | 'isPreorder' | 'flashSaleId' | 'warehouses'>,
  now: Date,
  flashWindow: boolean,
): Promise<string | null> {
  if (item.flashSaleId) {
    const sold = await tx
      .update(flashSale)
      .set({ sold: sql`${flashSale.sold} + ${item.qty}` })
      .where(
        and(
          eq(flashSale.id, item.flashSaleId),
          sql`${flashSale.sold} + ${item.qty} <= ${flashSale.cap}`,
          ...(flashWindow ? [lte(flashSale.startsAt, now), sql`${flashSale.endsAt} > ${now}`] : []),
        ),
      )
      .returning({ id: flashSale.id });
    if (sold.length === 0) throw new Conflict('FLASH_SOLD_OUT');
    const bought = await tx
      .insert(flashPurchase)
      .values({ flashSaleId: item.flashSaleId, customerId, orderId })
      .onConflictDoNothing()
      .returning({ id: flashPurchase.flashSaleId });
    if (bought.length === 0) throw new Conflict('FLASH_LIMIT_REACHED');
  }
  if (item.isPreorder) {
    const taken = await tx
      .update(variant)
      .set({ preorderSold: sql`${variant.preorderSold} + ${item.qty}` })
      .where(
        and(
          eq(variant.id, item.variantId),
          sql`${variant.preorderCap} is not null`,
          sql`${variant.preorderSold} + ${item.qty} <= ${variant.preorderCap}`,
        ),
      )
      .returning({ id: variant.id });
    if (taken.length === 0) throw new Conflict('OUT_OF_STOCK');
    return null;
  }
  for (const warehouseId of item.warehouses) {
    const taken = await tx
      .update(inventory)
      .set({ reserved: sql`${inventory.reserved} + ${item.qty}` })
      .where(
        and(
          eq(inventory.warehouseId, warehouseId),
          eq(inventory.variantId, item.variantId),
          sql`${inventory.onHand} - ${inventory.reserved} >= ${item.qty}`,
        ),
      )
      .returning({ warehouseId: inventory.warehouseId });
    if (taken.length) return warehouseId;
  }
  throw new Conflict('OUT_OF_STOCK');
}

/** The order an idempotency key already placed, if any. */
export async function findOrderIdByKey(customerId: CustomerId, db: Db | Tx, key: string) {
  const [row] = await db
    .select({ id: order.id })
    .from(order)
    .where(and(eq(order.customerId, customerId), eq(order.idempotencyKey, key)));
  return row?.id;
}

const isUniqueViolation = (e: unknown) =>
  (e as { code?: string; cause?: { code?: string } }).code === '23505' ||
  (e as { cause?: { code?: string } }).cause?.code === '23505';

/**
 * Places an order in one transaction: the order and its items, every reservation, and either a
 * 5-minute hold with a payment attempt (prepaid, D-56) or an allocation (COD, D-205). Any
 * reservation that fails rolls everything back. The same idempotency key returns the same order.
 */
export async function placeOrder(
  customerId: CustomerId,
  db: Db,
  input: NewOrder,
): Promise<PlaceResult> {
  const existing = await findOrderIdByKey(customerId, db, input.idempotencyKey);
  if (existing) return { status: 'existing', orderId: existing };
  try {
    return await db.transaction(async (tx) => {
      const [{ seq }] = (await tx.execute(sql`select nextval(${orderNumberSeq.seqName}) as seq`))
        .rows as [{ seq: string }];
      const [created] = await tx
        .insert(order)
        .values({
          customerId,
          number: input.number(Number(seq)),
          status: input.hold.kind === 'hold' ? 'pending_payment' : 'confirmed',
          address: input.address,
          subtotalPaise: input.subtotalPaise,
          discountPaise: input.couponDiscountPaise + input.paymentDiscountPaise,
          couponDiscountPaise: input.couponDiscountPaise,
          paymentDiscountPaise: input.paymentDiscountPaise,
          totalPaise: input.totalPaise,
          couponOfferId: input.couponOfferId,
          paymentOfferId: input.paymentOfferId,
          paymentMethod: input.paymentMethod,
          paymentBank: input.paymentBank,
          emiTenureMonths: input.emiTenureMonths,
          isPreorder: input.isPreorder,
          etaFrom: input.etaFrom,
          etaTo: input.etaTo,
          idempotencyKey: input.idempotencyKey,
          placedAt: input.now,
        })
        .returning({ id: order.id });
      const orderId = created!.id;
      const slugs = [...new Set(input.items.flatMap((i) => (i.bundleSlug ? [i.bundleSlug] : [])))];
      const bundleIds = new Map(
        slugs.length
          ? (
              await tx
                .select({ id: bundle.id, slug: bundle.slug })
                .from(bundle)
                .where(inArray(bundle.slug, slugs))
            ).map((b) => [b.slug, b.id])
          : [],
      );
      const holdStatus = input.hold.kind === 'hold' ? 'active' : 'converted';
      const expiresAt = input.hold.kind === 'hold' ? input.hold.expiresAt : input.now;
      for (const item of input.items) {
        const warehouseId = await reserve(tx, customerId, orderId, item, input.now, true);
        await tx.insert(orderItem).values({
          orderId,
          variantId: item.variantId,
          sku: item.sku,
          productName: item.productName,
          returnPolicy: item.returnPolicy,
          qty: item.qty,
          mrpPaise: item.mrpPaise,
          unitPricePaise: item.unitPricePaise,
          discountPaise: item.discountPaise,
          warehouseId,
          bundleId: item.bundleSlug ? (bundleIds.get(item.bundleSlug) ?? null) : null,
          flashSaleId: item.flashSaleId,
          hsnCode: item.hsnCode,
          gstRateBps: item.gstRateBps,
        });
        await tx.insert(stockHold).values({
          orderId,
          warehouseId,
          variantId: item.variantId,
          qty: item.qty,
          expiresAt,
          status: holdStatus,
        });
      }
      await tx
        .insert(orderEvent)
        .values([
          { orderId, step: 'placed', at: input.now },
          ...(input.hold.kind === 'allocate'
            ? [{ orderId, step: 'confirmed' as const, at: input.now }]
            : []),
        ]);
      let attemptId: string | null = null;
      if (input.hold.kind === 'hold') {
        const [attempt] = await tx
          .insert(payment)
          .values({
            orderId,
            method: input.paymentMethod,
            amountPaise: input.totalPaise,
            idempotencyKey: `${input.idempotencyKey}:1`,
            startedAt: input.now,
            expiresAt: input.hold.expiresAt,
          })
          .returning({ id: payment.id });
        attemptId = attempt!.id;
      }
      return { status: 'created' as const, orderId, attemptId };
    });
  } catch (e) {
    if (e instanceof Conflict) return { status: 'conflict', code: e.code };
    // A parallel request with the same key won: answer with its order.
    if (isUniqueViolation(e)) {
      const won = await findOrderIdByKey(customerId, db, input.idempotencyKey);
      if (won) return { status: 'existing', orderId: won };
    }
    throw e;
  }
}

export type OrderRecord = Awaited<ReturnType<typeof findOrder>> & {};

/** The customer's order with everything the order page and invoice show. */
export async function findOrder(customerId: CustomerId, db: Db, orderId: string) {
  const [row] = await db
    .select({
      order,
      couponCode: sql<
        string | null
      >`(select code from ${offer} where ${offer.id} = ${order.couponOfferId})`,
      paymentOfferName: sql<
        string | null
      >`(select name from ${offer} where ${offer.id} = ${order.paymentOfferId})`,
    })
    .from(order)
    .where(and(eq(order.customerId, customerId), eq(order.id, orderId)));
  if (!row) return undefined;
  const [items, holds, attempts, invoices, events, shipments, refunds, returns] = await Promise.all(
    [
      db
        .select({
          item: orderItem,
          productId: product.id,
          slug: product.slug,
          options: variant.options,
          bundleName: bundle.name,
          bundleSlug: bundle.slug,
          isPreorder: sql<boolean>`${product.status} = 'preorder'`,
          warehouseState: warehouse.state,
          warehouseName: warehouse.name,
          warehousePincode: warehouse.pincode,
          warehouseGstin: warehouse.gstin,
        })
        .from(orderItem)
        .innerJoin(variant, eq(variant.id, orderItem.variantId))
        .innerJoin(product, eq(product.id, variant.productId))
        .leftJoin(bundle, eq(bundle.id, orderItem.bundleId))
        .leftJoin(warehouse, eq(warehouse.id, orderItem.warehouseId))
        .where(eq(orderItem.orderId, orderId))
        .orderBy(asc(orderItem.bundleId), desc(orderItem.unitPricePaise), asc(orderItem.sku)),
      db.select().from(stockHold).where(eq(stockHold.orderId, orderId)),
      db
        .select()
        .from(payment)
        .where(eq(payment.orderId, orderId))
        .orderBy(desc(payment.startedAt), desc(payment.id)),
      db.select().from(invoice).where(eq(invoice.orderId, orderId)),
      db
        .select()
        .from(orderEvent)
        .where(eq(orderEvent.orderId, orderId))
        .orderBy(asc(orderEvent.at)),
      db.select().from(shipment).where(eq(shipment.orderId, orderId)),
      db.select().from(refund).where(eq(refund.orderId, orderId)).orderBy(asc(refund.createdAt)),
      db
        .select()
        .from(returnRequest)
        .innerJoin(orderItem, eq(orderItem.id, returnRequest.orderItemId))
        .where(and(eq(orderItem.orderId, orderId), eq(returnRequest.customerId, customerId)))
        .orderBy(desc(returnRequest.createdAt)),
    ],
  );
  return {
    ...row,
    items,
    holds,
    attempts,
    invoice: invoices[0] ?? null,
    events,
    shipment: shipments[0] ?? null,
    refunds,
    returns: returns.map((r) => r.return_request),
  };
}

/**
 * Ends an unpaid order whose hold has run out (D-57): stock, pre-order and flash reservations go
 * back, open payment attempts expire and the order is cancelled. Under a lock on the order, so it
 * runs once whether the job or a read gets there first. False when there was nothing to do.
 */
export async function expireHold(
  customerId: CustomerId,
  db: Db,
  orderId: string,
  now: Date,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ status: order.status })
      .from(order)
      .where(and(eq(order.customerId, customerId), eq(order.id, orderId)))
      .for('update');
    if (row?.status !== 'pending_payment') return false;
    const holds = await tx
      .select()
      .from(stockHold)
      .where(and(eq(stockHold.orderId, orderId), eq(stockHold.status, 'active')));
    if (holds.length === 0 || holds.some((h) => h.expiresAt > now)) return false;
    await release(tx, customerId, orderId, holds);
    await tx
      .update(stockHold)
      .set({ status: 'expired' })
      .where(and(eq(stockHold.orderId, orderId), eq(stockHold.status, 'active')));
    await tx
      .update(payment)
      .set({ status: 'expired' })
      .where(and(eq(payment.orderId, orderId), eq(payment.status, 'started')));
    await tx
      .update(order)
      .set({ status: 'cancelled', notice: 'HOLD_EXPIRED' })
      .where(eq(order.id, orderId));
    return true;
  });
}

/** Gives back what `reserve` took for these holds. */
async function release(
  tx: Tx,
  customerId: CustomerId,
  orderId: string,
  holds: (typeof stockHold.$inferSelect)[],
) {
  for (const h of holds) {
    if (h.warehouseId)
      await tx
        .update(inventory)
        .set({ reserved: sql`${inventory.reserved} - ${h.qty}` })
        .where(and(eq(inventory.warehouseId, h.warehouseId), eq(inventory.variantId, h.variantId)));
    else
      await tx
        .update(variant)
        .set({ preorderSold: sql`${variant.preorderSold} - ${h.qty}` })
        .where(eq(variant.id, h.variantId));
  }
  const flash = await tx
    .select({ saleId: orderItem.flashSaleId, qty: orderItem.qty })
    .from(orderItem)
    .where(and(eq(orderItem.orderId, orderId), sql`${orderItem.flashSaleId} is not null`));
  for (const f of flash) {
    await tx
      .update(flashSale)
      .set({ sold: sql`${flashSale.sold} - ${f.qty}` })
      .where(eq(flashSale.id, f.saleId!));
    await tx
      .delete(flashPurchase)
      .where(
        and(
          eq(flashPurchase.flashSaleId, f.saleId!),
          eq(flashPurchase.customerId, customerId),
          eq(flashPurchase.orderId, orderId),
        ),
      );
  }
}

/** The customer's order behind a payment attempt, for gateway callbacks. */
async function ownAttempt(tx: Db | Tx, customerId: CustomerId, orderId: string, attemptId: string) {
  const [row] = await tx
    .select({ status: payment.status })
    .from(payment)
    .innerJoin(order, eq(order.id, payment.orderId))
    .where(and(eq(order.customerId, customerId), eq(order.id, orderId), eq(payment.id, attemptId)));
  return row;
}

export type SettleDecision = (facts: {
  holdExpiresAt: number;
  holdReleased: boolean;
  unitAvailableNow: boolean;
}) => 'confirm' | 'refund';

/** Rolls back the late re-reservation when the decision is to refund. */
class Refund extends Error {}

/**
 * Settles a gateway success once, in one transaction under a lock on the order (D-59, D-212):
 * the attempt is claimed (a repeated callback finds nothing to claim), then
 * - the hold still in place and running: it becomes the allocation, the order is confirmed;
 * - otherwise any hold that ran out is released first, every item is reserved again (all or
 *   nothing; flash units against the cap only, the customer paid during the sale) and `decide`
 *   (the shared rule) confirms with the new allocation or refunds in full with nothing reserved.
 */
export async function settlePayment(
  customerId: CustomerId,
  db: Db,
  input: {
    orderId: string;
    attemptId: string;
    /** Warehouses to try per order item id, for a new reservation. */
    warehouses: Map<string, string[]>;
    decide: SettleDecision;
    at: Date;
  },
): Promise<'confirmed' | 'confirmedLate' | 'refunded' | 'refundedCancelled' | 'unchanged'> {
  const { orderId, at } = input;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ status: order.status, total: order.totalPaise, notice: order.notice })
      .from(order)
      .where(and(eq(order.customerId, customerId), eq(order.id, orderId)))
      .for('update');
    if (!row) return 'unchanged';
    const claimed = await tx
      .update(payment)
      .set({ status: 'succeeded', succeededAt: at })
      .where(
        and(
          eq(payment.id, input.attemptId),
          eq(payment.orderId, orderId),
          inArray(payment.status, ['started', 'expired']),
        ),
      )
      .returning({ id: payment.id });
    if (claimed.length === 0) return 'unchanged';
    if (row.status === 'cancelled' && row.notice === 'CANCELLED_BY_CUSTOMER') {
      // The customer cancelled while this payment was on its way: it is paid straight back.
      await tx.insert(refund).values({
        orderId,
        paymentId: input.attemptId,
        amountPaise: row.total,
        reason: 'Payment arrived after the customer cancelled the order (D-216).',
        status: 'processed',
        createdAt: at,
      });
      return 'refundedCancelled';
    }

    const holds = await tx.select().from(stockHold).where(eq(stockHold.orderId, orderId));
    const active = holds.filter((h) => h.status === 'active');
    const holdExpiresAt = Math.max(...holds.map((h) => h.expiresAt.getTime()));
    const running =
      row.status === 'pending_payment' &&
      active.length > 0 &&
      active.every((h) => h.expiresAt > at);
    if (running) {
      await tx
        .update(stockHold)
        .set({ status: 'converted' })
        .where(and(eq(stockHold.orderId, orderId), eq(stockHold.status, 'active')));
      await tx
        .update(order)
        .set({ status: 'confirmed', notice: null })
        .where(eq(order.id, orderId));
      await tx.insert(orderEvent).values({ orderId, step: 'confirmed', at }).onConflictDoNothing();
      return 'confirmed';
    }
    if (row.status === 'pending_payment' && active.length) {
      // The hold ran out and its job hasn't run yet: give the stock back first.
      await release(tx, customerId, orderId, active);
      await tx
        .update(stockHold)
        .set({ status: 'expired' })
        .where(and(eq(stockHold.orderId, orderId), eq(stockHold.status, 'active')));
    } else if (row.status !== 'pending_payment' && row.status !== 'cancelled') {
      return 'unchanged';
    }

    const items = await tx
      .select({ item: orderItem, isPreorder: sql<boolean>`${product.status} = 'preorder'` })
      .from(orderItem)
      .innerJoin(variant, eq(variant.id, orderItem.variantId))
      .innerJoin(product, eq(product.id, variant.productId))
      .where(eq(orderItem.orderId, orderId));
    let outcome: 'confirmedLate' | 'refunded' = 'confirmedLate';
    try {
      await tx.transaction(async (sp) => {
        let available = true;
        const reserved: { itemId: string; warehouseId: string | null }[] = [];
        try {
          for (const { item, isPreorder } of items) {
            const warehouseId = await reserve(
              sp,
              customerId,
              orderId,
              {
                variantId: item.variantId,
                qty: item.qty,
                isPreorder,
                flashSaleId: item.flashSaleId,
                warehouses: input.warehouses.get(item.id) ?? [],
              },
              at,
              false,
            );
            reserved.push({ itemId: item.id, warehouseId });
          }
        } catch (e) {
          if (!(e instanceof Conflict)) throw e;
          available = false;
        }
        const decision = input.decide({
          holdExpiresAt,
          holdReleased: true,
          unitAvailableNow: available,
        });
        if (decision === 'refund' || !available) throw new Refund();
        for (const r of reserved) {
          const { item } = items.find((i) => i.item.id === r.itemId)!;
          await sp
            .update(orderItem)
            .set({ warehouseId: r.warehouseId })
            .where(eq(orderItem.id, item.id));
          await sp.insert(stockHold).values({
            orderId,
            warehouseId: r.warehouseId,
            variantId: item.variantId,
            qty: item.qty,
            expiresAt: at,
            status: 'converted',
          });
        }
      });
    } catch (e) {
      if (!(e instanceof Refund) && !(e instanceof Conflict)) throw e;
      outcome = 'refunded';
    }
    if (outcome === 'confirmedLate') {
      await tx
        .update(order)
        .set({ status: 'confirmed', notice: 'CONFIRMED_AFTER_EXPIRY' })
        .where(eq(order.id, orderId));
      await tx.insert(orderEvent).values({ orderId, step: 'confirmed', at }).onConflictDoNothing();
      return outcome;
    }
    await tx
      .update(payment)
      .set({ status: 'expired' })
      .where(and(eq(payment.orderId, orderId), eq(payment.status, 'started')));
    await tx.insert(refund).values({
      orderId,
      paymentId: input.attemptId,
      amountPaise: row.total,
      reason: 'Payment arrived after the stock hold ended and the items had sold out (D-59).',
      status: 'processed',
    });
    await tx
      .update(order)
      .set({ status: 'refunded', notice: 'REFUNDED_AFTER_EXPIRY' })
      .where(eq(order.id, orderId));
    return outcome;
  });
}

/** A failed attempt: nothing charged, the hold keeps running (D-204). */
export async function failAttempt(
  customerId: CustomerId,
  db: Db,
  orderId: string,
  attemptId: string,
): Promise<boolean> {
  if (!(await ownAttempt(db, customerId, orderId, attemptId))) return false;
  const failed = await db
    .update(payment)
    .set({ status: 'failed' })
    .where(and(eq(payment.id, attemptId), eq(payment.status, 'started')))
    .returning({ id: payment.id });
  if (failed.length)
    await db
      .update(order)
      .set({ notice: 'PAYMENT_FAILED' })
      .where(and(eq(order.id, orderId), eq(order.status, 'pending_payment')));
  return failed.length > 0;
}

/**
 * Another attempt within the same hold (D-204): it ends when the hold ends, never later. Only
 * when the order is still unpaid and no attempt is open.
 */
export async function startAttempt(
  customerId: CustomerId,
  db: Db,
  orderId: string,
  now: Date,
): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(order)
      .where(and(eq(order.customerId, customerId), eq(order.id, orderId)))
      .for('update');
    if (row?.status !== 'pending_payment') return null;
    const attempts = await tx.select().from(payment).where(eq(payment.orderId, orderId));
    if (attempts.some((a) => a.status === 'started')) return null;
    const [hold] = await tx
      .select({ expiresAt: stockHold.expiresAt })
      .from(stockHold)
      .where(and(eq(stockHold.orderId, orderId), eq(stockHold.status, 'active')))
      .limit(1);
    if (!hold || hold.expiresAt <= now) return null;
    const [attempt] = await tx
      .insert(payment)
      .values({
        orderId,
        method: row.paymentMethod,
        amountPaise: row.totalPaise,
        idempotencyKey: `${row.idempotencyKey}:${attempts.length + 1}`,
        startedAt: now,
        expiresAt: hold.expiresAt,
      })
      .returning({ id: payment.id });
    await tx.update(order).set({ notice: null }).where(eq(order.id, orderId));
    return attempt!.id;
  });
}

/** The gateway's reference for an attempt (mock: derived from the attempt). */
export async function setGatewayRef(
  customerId: CustomerId,
  db: Db,
  orderId: string,
  attemptId: string,
  gatewayRef: string,
): Promise<void> {
  if (!(await ownAttempt(db, customerId, orderId, attemptId))) return;
  await db.update(payment).set({ gatewayRef }).where(eq(payment.id, attemptId));
}

/**
 * Issues the order's GST invoice once (D-173, D-208): the next number in the sequence, the
 * shipping warehouse's state and the delivery state (D-209).
 */
export async function issueInvoice(
  customerId: CustomerId,
  db: Db,
  orderId: string,
  number: (seq: number) => string,
  now: Date,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ address: order.address, status: order.status })
      .from(order)
      .where(and(eq(order.customerId, customerId), eq(order.id, orderId)))
      .for('update');
    if (row?.status !== 'confirmed') return;
    const [already] = await tx.select().from(invoice).where(eq(invoice.orderId, orderId));
    if (already) return;
    const [supplier] = await tx
      .select({ state: warehouse.state })
      .from(orderItem)
      .innerJoin(warehouse, eq(warehouse.id, orderItem.warehouseId))
      .where(eq(orderItem.orderId, orderId))
      .orderBy(asc(orderItem.id))
      .limit(1);
    if (!supplier?.state) return;
    const [{ seq }] = (await tx.execute(sql`select nextval(${invoiceNumberSeq.seqName}) as seq`))
      .rows as [{ seq: string }];
    await tx.insert(invoice).values({
      orderId,
      number: number(Number(seq)),
      supplierState: supplier.state,
      placeOfSupply: String((row.address as { state?: string }).state ?? ''),
      issuedAt: now,
    });
  });
}

/** Where messages about this customer's orders go (D-101). */
export async function findCustomerEmail(
  customerId: CustomerId,
  db: Db,
): Promise<string | undefined> {
  const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, customerId));
  return row?.email;
}

/** Flash sales this customer already bought, to apply the limit of one (D-142). */
export async function countFlashPurchases(
  customerId: CustomerId,
  db: Db,
  saleIds: string[],
): Promise<Map<string, number>> {
  if (saleIds.length === 0) return new Map();
  const rows = await db
    .select({ saleId: flashPurchase.flashSaleId, n: sql<number>`count(*)::int` })
    .from(flashPurchase)
    .where(
      and(eq(flashPurchase.customerId, customerId), inArray(flashPurchase.flashSaleId, saleIds)),
    )
    .groupBy(flashPurchase.flashSaleId);
  return new Map(rows.map((r) => [r.saleId, r.n]));
}

/** One page of the customer's orders, newest first (keyset on placed time, then id). */
export async function listOrders(
  customerId: CustomerId,
  db: Db,
  page: { limit: number; after?: { placedAt: Date; id: string } },
) {
  const rows = await db
    .select({
      order,
      // Qualified by hand: Drizzle leaves single-table columns unqualified, and inside the
      // subquery a bare "id" would mean order_item.id.
      itemCount: sql<number>`(select coalesce(sum(oi.qty), 0)::int from ${orderItem} oi where oi.order_id = "order"."id")`,
    })
    .from(order)
    .where(
      and(
        eq(order.customerId, customerId),
        page.after
          ? sql`(${order.placedAt}, ${order.id}) < (${page.after.placedAt}, ${page.after.id})`
          : undefined,
      ),
    )
    .orderBy(desc(order.placedAt), desc(order.id))
    .limit(page.limit + 1);
  const ids = rows.map((r) => r.order.id);
  const items = ids.length
    ? await db
        .select({
          orderId: orderItem.orderId,
          productId: product.id,
          name: orderItem.productName,
        })
        .from(orderItem)
        .innerJoin(variant, eq(variant.id, orderItem.variantId))
        .innerJoin(product, eq(product.id, variant.productId))
        .where(inArray(orderItem.orderId, ids))
        .orderBy(asc(orderItem.orderId), desc(orderItem.unitPricePaise), asc(orderItem.sku))
    : [];
  return {
    rows: rows.slice(0, page.limit).map((r) => ({
      ...r,
      items: items.filter((i) => i.orderId === r.order.id),
    })),
    hasMore: rows.length > page.limit,
  };
}

/** Orders by status, for the account overview. */
export async function countOrders(customerId: CustomerId, db: Db) {
  const rows = await db
    .select({ status: order.status, n: sql<number>`count(*)::int` })
    .from(order)
    .where(eq(order.customerId, customerId))
    .groupBy(order.status);
  return new Map(rows.map((r) => [r.status, r.n]));
}

export type CancelDecision = (facts: {
  status: (typeof order.$inferSelect)['status'];
  prepaid: boolean;
  totalPaise: number;
}) => { ok: false } | { ok: true; refundPaise: number };

/**
 * Cancels the customer's order (D-149, D-216) under a lock on it: `decide` (the shared rule)
 * says whether it may and what to refund. Every reservation still in place goes back (stock,
 * pre-order cap, flash units), open payment attempts end, a refund is recorded against the
 * successful payment, and the order is cancelled. Null when it can't be cancelled.
 */
export async function cancelOrder(
  customerId: CustomerId,
  db: Db,
  orderId: string,
  decide: CancelDecision,
  now: Date,
): Promise<{ refundPaise: number } | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(order)
      .where(and(eq(order.customerId, customerId), eq(order.id, orderId)))
      .for('update');
    if (!row) return null;
    const decision = decide({
      status: row.status,
      prepaid: row.paymentMethod !== 'cod',
      totalPaise: row.totalPaise,
    });
    if (!decision.ok) return null;
    const holds = await tx
      .select()
      .from(stockHold)
      .where(
        and(eq(stockHold.orderId, orderId), inArray(stockHold.status, ['active', 'converted'])),
      );
    if (holds.length) await release(tx, customerId, orderId, holds);
    await tx
      .update(stockHold)
      .set({ status: 'released' })
      .where(
        and(eq(stockHold.orderId, orderId), inArray(stockHold.status, ['active', 'converted'])),
      );
    await tx
      .update(payment)
      .set({ status: 'expired' })
      .where(and(eq(payment.orderId, orderId), eq(payment.status, 'started')));
    if (decision.refundPaise > 0) {
      const [paid] = await tx
        .select({ id: payment.id })
        .from(payment)
        .where(and(eq(payment.orderId, orderId), eq(payment.status, 'succeeded')))
        .limit(1);
      if (paid)
        await tx.insert(refund).values({
          orderId,
          paymentId: paid.id,
          amountPaise: decision.refundPaise,
          reason: 'Cancelled by the customer before dispatch (D-216).',
          status: 'processed',
          createdAt: now,
        });
    }
    await tx
      .update(order)
      .set({ status: 'cancelled', notice: 'CANCELLED_BY_CUSTOMER', cancelledAt: now })
      .where(eq(order.id, orderId));
    return { refundPaise: decision.refundPaise };
  });
}

export type TrackingStepName = (typeof orderEvent.$inferSelect)['step'];

/**
 * Moves the order one tracking step (D-215), only from the status the caller saw, so a repeated
 * click does nothing. Shipping takes the units out of the warehouse (on hand and reserved both
 * drop) and books the demo consignment; delivery stamps every line's return window.
 */
export async function advanceOrder(
  customerId: CustomerId,
  db: Db,
  input: {
    orderId: string;
    from: (typeof order.$inferSelect)['status'];
    step: TrackingStepName;
    status: (typeof order.$inferSelect)['status'];
    at: Date;
    courier: { name: string; trackingNo: string };
    returnWindowEndsAt: Date;
  },
): Promise<boolean> {
  const { orderId, at } = input;
  return db.transaction(async (tx) => {
    const moved = await tx
      .update(order)
      .set({
        status: input.status,
        ...(input.step === 'delivered' ? { deliveredAt: at } : {}),
      })
      .where(
        and(eq(order.customerId, customerId), eq(order.id, orderId), eq(order.status, input.from)),
      )
      .returning({ id: order.id });
    if (moved.length === 0) return false;
    const added = await tx
      .insert(orderEvent)
      .values({ orderId, step: input.step, at })
      .onConflictDoNothing()
      .returning({ id: orderEvent.id });
    if (added.length === 0) throw new Error(`step ${input.step} already recorded`);
    if (input.step === 'shipped') {
      const holds = await tx
        .select()
        .from(stockHold)
        .where(and(eq(stockHold.orderId, orderId), eq(stockHold.status, 'converted')));
      for (const h of holds)
        if (h.warehouseId)
          await tx
            .update(inventory)
            .set({
              onHand: sql`${inventory.onHand} - ${h.qty}`,
              reserved: sql`${inventory.reserved} - ${h.qty}`,
            })
            .where(
              and(eq(inventory.warehouseId, h.warehouseId), eq(inventory.variantId, h.variantId)),
            );
      await tx.insert(shipment).values({
        orderId,
        courier: input.courier.name,
        trackingNo: input.courier.trackingNo,
        status: 'in_transit',
      });
    }
    if (input.step === 'outForDelivery')
      await tx
        .update(shipment)
        .set({ status: 'out_for_delivery' })
        .where(eq(shipment.orderId, orderId));
    if (input.step === 'delivered') {
      await tx
        .update(shipment)
        .set({ status: 'delivered', deliveredAt: at })
        .where(eq(shipment.orderId, orderId));
      await tx
        .update(orderItem)
        .set({ returnWindowEndsAt: input.returnWindowEndsAt })
        .where(eq(orderItem.orderId, orderId));
    }
    return true;
  });
}

/**
 * The customer's delivered order lines (D-24): what they own, what they can review. `returned`
 * when a return (not a replacement) for the line completed.
 */
export async function listDeliveredLines(customerId: CustomerId, db: Db) {
  return db
    .select({
      orderItemId: orderItem.id,
      orderId: order.id,
      orderNumber: order.number,
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      categoryName: category.name,
      options: variant.options,
      deliveredAt: order.deliveredAt,
      returnWindowEndsAt: orderItem.returnWindowEndsAt,
      returned: sql<boolean>`exists (select 1 from ${returnRequest} where ${returnRequest.orderItemId} = ${orderItem.id} and ${returnRequest.kind} = 'return' and ${returnRequest.status} = 'completed')`,
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
        sql`${order.deliveredAt} is not null`,
      ),
    )
    .orderBy(desc(order.deliveredAt));
}

export type DeliveredLineRow = Awaited<ReturnType<typeof listDeliveredLines>>[number];
