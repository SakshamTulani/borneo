import { z } from 'zod';
import { cartViewSchema } from './cart';
import { codBlockSchema } from './delivery';
import { epochMsSchema, idSchema, paiseSchema } from './common';
import { paymentMethodSchema, paymentSelectionSchema } from './offers';
import { orderStatusSchema } from './orders';

/** `GET /me/checkout`: the payment the customer is considering (all optional; nothing pre-chosen, D-06). */
export const checkoutQuerySchema = z.object({
  addressId: idSchema.optional(),
  method: paymentMethodSchema.optional(),
  bank: z.string().trim().min(1).max(60).optional(),
  tenureMonths: z.coerce.number().int().positive().optional(),
  paymentOfferId: idSchema.optional(),
});
export type CheckoutQuery = z.infer<typeof checkoutQuerySchema>;

/** Why an order can't be placed yet (D-55, D-198, D-201, D-202). */
export const checkoutBlockSchema = z.enum([
  'CART_EMPTY',
  'LINES_NEED_ATTENTION',
  'NO_ADDRESS',
  'NOT_DELIVERABLE',
  'NO_PAYMENT_METHOD',
  'PAYMENT_NOT_ALLOWED',
  'EMI_PLAN_NEEDED',
  'PAYMENT_OFFER_NOT_APPLICABLE',
]);
export type CheckoutBlock = z.infer<typeof checkoutBlockSchema>;

/** One way to pay, and why it can't be used here when it can't (D-70, D-71). */
export const checkoutMethodSchema = z.object({
  method: paymentMethodSchema,
  allowed: z.boolean(),
  /** COD: why not (pincode, pre-order, flash sale). */
  reasons: z.array(codBlockSchema),
});

/** An EMI plan available at this order total, with its instalment (D-33, D-45, D-47). */
export const checkoutEmiPlanSchema = z.object({
  bank: z.string().min(1),
  tenureMonths: z.number().int().positive(),
  annualRateBps: z.number().int().min(0),
  /** On the total before any payment offer. */
  monthlyPaise: paiseSchema,
  /** A live no-cost EMI offer for this plan, if any; the customer chooses it (D-35). */
  noCostOfferId: idSchema.nullable(),
});
export type CheckoutEmiPlan = z.infer<typeof checkoutEmiPlanSchema>;

/** A payment offer as checkout shows it: what it needs, and what it saves on this order. */
export const checkoutPaymentOfferSchema = z.object({
  id: idSchema,
  kind: z.enum(['bank', 'noCostEmi']),
  name: z.string().min(1),
  validTo: epochMsSchema,
  methods: z.array(paymentMethodSchema),
  banks: z.array(z.string()).nullable(),
  tenureMonths: z.number().int().positive().nullable(),
  /** What it would save on this order when paid its way; null when it can't apply. */
  savingPaise: paiseSchema.nullable(),
  reason: z.string().min(1).nullable(),
});
export type CheckoutPaymentOffer = z.infer<typeof checkoutPaymentOfferSchema>;

/** `GET /me/checkout`: the account cart priced at the chosen address and payment. */
export const checkoutViewSchema = z.object({
  /** The cart at the address's pincode: per-line delivery dates (D-55). */
  cart: cartViewSchema,
  addressId: idSchema.nullable(),
  methods: z.array(checkoutMethodSchema),
  banks: z.array(z.string()),
  emiPlans: z.array(checkoutEmiPlanSchema),
  paymentOffers: z.array(checkoutPaymentOfferSchema),
  /** The order as it would be charged with the payment chosen (D-35, D-44). */
  totals: z.object({
    subtotalPaise: paiseSchema,
    couponDiscountPaise: paiseSchema,
    paymentDiscountPaise: paiseSchema,
    totalPaise: paiseSchema,
    /** EMI: what each month costs on the plan chosen. */
    emiMonthlyPaise: paiseSchema.nullable(),
  }),
  /** Why the chosen payment offer doesn't apply; null when none is chosen or it applies. */
  paymentOfferReason: z.string().nullable(),
  blocks: z.array(checkoutBlockSchema),
  canPlace: z.boolean(),
});
export type CheckoutView = z.infer<typeof checkoutViewSchema>;

/**
 * `POST /me/orders` (with an `Idempotency-Key` header). `expectedTotalPaise` is the total the
 * customer saw: a different total refuses the order with the new one (D-201).
 */
export const placeOrderRequestSchema = z.object({
  addressId: idSchema,
  payment: paymentSelectionSchema,
  paymentOfferId: idSchema.optional(),
  expectedTotalPaise: paiseSchema,
});
export type PlaceOrderRequest = z.infer<typeof placeOrderRequestSchema>;

export const idempotencyKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,80}$/, 'Idempotency-Key must be 8–80 letters, digits, - or _');

/** What the customer was told about how a payment ended (D-57, D-59). */
export const orderNoticeSchema = z.enum([
  'PAYMENT_FAILED',
  'HOLD_EXPIRED',
  'CONFIRMED_AFTER_EXPIRY',
  'REFUNDED_AFTER_EXPIRY',
]);
export type OrderNotice = z.infer<typeof orderNoticeSchema>;

export const orderItemViewSchema = z.object({
  sku: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  options: z.record(z.string(), z.string()),
  qty: z.number().int().positive(),
  mrpPaise: paiseSchema,
  unitPricePaise: paiseSchema,
  /** Everything off `unitPricePaise × qty`: bundle saving, coupon and payment-offer shares. */
  discountPaise: paiseSchema,
  bundleName: z.string().nullable(),
  isFlash: z.boolean(),
  isPreorder: z.boolean(),
});
export type OrderItemView = z.infer<typeof orderItemViewSchema>;

const addressSnapshotSchema = z.object({
  name: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  landmark: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
});
export type AddressSnapshot = z.infer<typeof addressSnapshotSchema>;

/** `GET /me/orders/:id` and the answer to placing or paying. */
export const orderViewSchema = z.object({
  id: idSchema,
  number: z.string(),
  status: orderStatusSchema,
  placedAt: epochMsSchema,
  address: addressSnapshotSchema,
  items: z.array(orderItemViewSchema),
  subtotalPaise: paiseSchema,
  couponDiscountPaise: paiseSchema,
  couponCode: z.string().nullable(),
  paymentDiscountPaise: paiseSchema,
  paymentOfferName: z.string().nullable(),
  totalPaise: paiseSchema,
  payment: z.object({
    method: paymentMethodSchema,
    bank: z.string().nullable(),
    tenureMonths: z.number().int().positive().nullable(),
    /** The open attempt, if any: the mock gateway acts on it. */
    attemptId: idSchema.nullable(),
  }),
  /** While payment is pending: the real end of the 5-minute hold (D-56). */
  holdExpiresAt: epochMsSchema.nullable(),
  eta: z.object({ from: z.string(), to: z.string() }).nullable(),
  isPreorder: z.boolean(),
  invoiceNumber: z.string().nullable(),
  notice: orderNoticeSchema.nullable(),
});
export type OrderView = z.infer<typeof orderViewSchema>;

/** Demo only: what the mock gateway does with an attempt (D-213). */
export const mockPaymentRequestSchema = z.object({
  result: z.enum(['success', 'failure', 'lateSuccess']),
});
export type MockPaymentRequest = z.infer<typeof mockPaymentRequestSchema>;
