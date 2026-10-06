import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { at, createdAt, customerId, id, paise, updatedAt } from './columns';
import { product, returnPolicy, variant } from './catalog';
import { warehouse } from './inventory';
import { bundle, flashSale, offer } from './offers';

export const orderStatus = pgEnum('order_status', [
  'pending_payment',
  'paid',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);
export const paymentMethod = pgEnum('payment_method', ['upi', 'card', 'emi', 'cod']);
export const paymentStatus = pgEnum('payment_status', [
  'started',
  'succeeded',
  'failed',
  'expired',
]);
export const refundStatus = pgEnum('refund_status', ['pending', 'processed', 'failed']);
export const shipmentStatus = pgEnum('shipment_status', [
  'created',
  'in_transit',
  'out_for_delivery',
  'delivered',
]);
export const returnKind = pgEnum('return_kind', ['return', 'replacement']);
export const returnReason = pgEnum('return_reason', ['defect', 'damage', 'changedMind', 'other']);
export const holdStatus = pgEnum('hold_status', ['active', 'converted', 'expired']);
export const returnStatus = pgEnum('return_status', [
  'requested',
  'approved',
  'rejected',
  'completed',
]);

/** No stock is held in the cart (D-56). */
export const cart = pgTable('cart', {
  id: id(),
  customerId: customerId().unique(),
  updatedAt: updatedAt(),
});

export const cartItem = pgTable(
  'cart_item',
  {
    id: id(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => cart.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => variant.id),
    bundleId: uuid('bundle_id').references(() => bundle.id),
    flashSaleId: uuid('flash_sale_id').references(() => flashSale.id),
    qty: integer('qty').notNull(),
  },
  (t) => [
    index('cart_item_cart').on(t.cartId),
    unique('cart_item_line')
      .on(t.cartId, t.variantId, t.bundleId, t.flashSaleId)
      .nullsNotDistinct(),
    check('cart_item_one_target', sql`num_nonnulls(${t.variantId}, ${t.bundleId}) = 1`),
    // D-39: flash price and bundle price don't combine.
    check(
      'cart_item_flash_not_bundle',
      sql`not (${t.bundleId} is not null and ${t.flashSaleId} is not null)`,
    ),
    check('cart_item_qty_positive', sql`${t.qty} > 0`),
  ],
);

export const order = pgTable(
  'order',
  {
    id: id(),
    customerId: customerId(),
    number: text('number').notNull().unique(),
    status: orderStatus('status').notNull().default('pending_payment'),
    /** Snapshot: later address edits never change a placed order. */
    address: jsonb('address').$type<Record<string, unknown>>().notNull(),
    subtotalPaise: paise('subtotal_paise').notNull(),
    discountPaise: paise('discount_paise').notNull().default(0),
    totalPaise: paise('total_paise').notNull(),
    couponOfferId: uuid('coupon_offer_id').references(() => offer.id),
    paymentOfferId: uuid('payment_offer_id').references(() => offer.id),
    paymentMethod: paymentMethod('payment_method').notNull(),
    isPreorder: boolean('is_preorder').notNull().default(false),
    etaFrom: date('eta_from', { mode: 'string' }),
    etaTo: date('eta_to', { mode: 'string' }),
    /** Payment start and order placement are idempotent per customer (api-design.md). */
    idempotencyKey: text('idempotency_key').notNull(),
    placedAt: at('placed_at').notNull().defaultNow(),
  },
  (t) => [
    index('order_customer').on(t.customerId, t.placedAt),
    uniqueIndex('order_idempotency').on(t.customerId, t.idempotencyKey),
    check('order_amounts', sql`${t.discountPaise} >= 0 and ${t.totalPaise} >= 0`),
    check('order_total', sql`${t.totalPaise} = ${t.subtotalPaise} - ${t.discountPaise}`),
    // D-71: no COD for pre-orders.
    check('order_preorder_no_cod', sql`not (${t.isPreorder} and ${t.paymentMethod} = 'cod')`),
  ],
);

export const orderItem = pgTable(
  'order_item',
  {
    id: id(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variant.id),
    /** Snapshots: later catalog or config edits never rewrite a placed order or invoice (D-89, D-173). */
    sku: text('sku').notNull(),
    productName: text('product_name').notNull(),
    returnPolicy: returnPolicy('return_policy').notNull(),
    qty: integer('qty').notNull(),
    mrpPaise: paise('mrp_paise').notNull(),
    unitPricePaise: paise('unit_price_paise').notNull(),
    discountPaise: paise('discount_paise').notNull().default(0),
    warehouseId: uuid('warehouse_id').references(() => warehouse.id),
    bundleId: uuid('bundle_id').references(() => bundle.id),
    flashSaleId: uuid('flash_sale_id').references(() => flashSale.id),
    /** Drives return requests and hiding the upgrade badge (D-87, D-132). */
    returnWindowEndsAt: at('return_window_ends_at'),
  },
  (t) => [
    index('order_item_order').on(t.orderId),
    check('order_item_qty_positive', sql`${t.qty} > 0`),
    check(
      'order_item_amounts',
      sql`${t.unitPricePaise} > 0 and ${t.unitPricePaise} <= ${t.mrpPaise} and ${t.discountPaise} >= 0`,
    ),
  ],
);

/** 5-minute hold from payment start (D-56); expiry via pg-boss (ADR-0004). */
export const stockHold = pgTable(
  'stock_hold',
  {
    id: id(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => order.id),
    /** Null for pre-order holds, which reserve against the variant's pre-order cap (D-65). */
    warehouseId: uuid('warehouse_id').references(() => warehouse.id),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variant.id),
    qty: integer('qty').notNull(),
    expiresAt: at('expires_at').notNull(),
    status: holdStatus('status').notNull().default('active'),
  },
  (t) => [
    index('stock_hold_order').on(t.orderId),
    check('stock_hold_qty_positive', sql`${t.qty} > 0`),
  ],
);

/** One purchase per customer per sale (D-142), enforced by the primary key. */
export const flashPurchase = pgTable(
  'flash_purchase',
  {
    flashSaleId: uuid('flash_sale_id')
      .notNull()
      .references(() => flashSale.id),
    customerId: customerId(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => order.id),
  },
  (t) => [primaryKey({ columns: [t.flashSaleId, t.customerId] })],
);

export const payment = pgTable(
  'payment',
  {
    id: id(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => order.id),
    gatewayRef: text('gateway_ref'),
    method: paymentMethod('method').notNull(),
    amountPaise: paise('amount_paise').notNull(),
    status: paymentStatus('status').notNull().default('started'),
    idempotencyKey: text('idempotency_key').notNull(),
    startedAt: at('started_at').notNull().defaultNow(),
    /** started_at + 5 min (D-58); a later success is a late payment (D-59). */
    expiresAt: at('expires_at').notNull(),
    succeededAt: at('succeeded_at'),
  },
  (t) => [
    index('payment_order').on(t.orderId),
    uniqueIndex('payment_gateway_ref').on(t.gatewayRef),
    uniqueIndex('payment_idempotency').on(t.orderId, t.idempotencyKey),
    check('payment_amount_positive', sql`${t.amountPaise} > 0`),
  ],
);

export const refund = pgTable(
  'refund',
  {
    id: id(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => order.id),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payment.id),
    amountPaise: paise('amount_paise').notNull(),
    reason: text('reason').notNull(),
    status: refundStatus('status').notNull().default('pending'),
    createdAt: createdAt(),
  },
  (t) => [check('refund_amount_positive', sql`${t.amountPaise} > 0`)],
);

export const shipment = pgTable('shipment', {
  id: id(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => order.id),
  courier: text('courier').notNull(),
  trackingNo: text('tracking_no').notNull(),
  status: shipmentStatus('status').notNull().default('created'),
  events: jsonb('events').$type<Record<string, unknown>[]>().notNull().default([]),
  deliveredAt: at('delivered_at'),
});

export const returnRequest = pgTable(
  'return_request',
  {
    id: id(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItem.id),
    customerId: customerId(),
    kind: returnKind('kind').notNull(),
    reason: returnReason('reason').notNull(),
    details: text('details'),
    /** MinIO keys; required for defect or damage (D-88). */
    photoKeys: text('photo_keys').array().notNull().default([]),
    status: returnStatus('status').notNull().default('requested'),
    createdAt: createdAt(),
  },
  (t) => [
    index('return_request_customer').on(t.customerId),
    // D-88: defect or damage needs photos.
    check(
      'return_request_photos',
      sql`${t.reason} not in ('defect', 'damage') or cardinality(${t.photoKeys}) > 0`,
    ),
  ],
);

/** B2C GST tax invoice (D-173). */
export const invoice = pgTable('invoice', {
  id: id(),
  orderId: uuid('order_id')
    .notNull()
    .unique()
    .references(() => order.id),
  number: text('number').notNull().unique(),
  s3Key: text('s3_key').notNull(),
  issuedAt: at('issued_at').notNull().defaultNow(),
});

/** Verified purchases only: one review per order item (D-150). */
export const review = pgTable(
  'review',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .references(() => product.id),
    customerId: customerId(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .unique()
      .references(() => orderItem.id),
    rating: integer('rating').notNull(),
    title: text('title'),
    body: text('body'),
    createdAt: createdAt(),
  },
  (t) => [
    index('review_product').on(t.productId),
    check('review_rating', sql`${t.rating} between 1 and 5`),
  ],
);
