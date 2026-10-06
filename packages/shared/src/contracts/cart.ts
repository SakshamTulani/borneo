import { z } from 'zod';
import { codBlockSchema } from './delivery';
import { productImageSchema, productSummarySchema } from './catalog';
import { epochMsSchema, idSchema, paiseSchema, pincodeSchema } from './common';

/**
 * A priced cart line. `priceSource` says which price the unit price came from:
 * coupons apply only to regular lines (D-36, D-37); bundles never take flash prices (D-39).
 */
export const cartLineSchema = z
  .object({
    lineId: idSchema,
    kind: z.enum(['item', 'bundle']),
    /** One category for items; every member's category for bundles. */
    categoryIds: z.array(idSchema).min(1),
    qty: z.number().int().positive(),
    unitPricePaise: paiseSchema,
    priceSource: z.enum(['regular', 'flash', 'bundle']),
    isPreorder: z.boolean().default(false),
  })
  .refine(
    (l) => (l.kind === 'bundle') === (l.priceSource === 'bundle'),
    'bundle lines use bundle prices, item lines never do',
  );
export type CartLine = z.infer<typeof cartLineSchema>;

/** Up to 5 units per line and 20 lines per cart (D-193). */
export const MAX_LINE_QTY = 5;
export const MAX_CART_LINES = 20;

/**
 * What a cart line is: `item:<SKU>` for a variant, `bundle:<slug>` for a fixed bundle (D-38).
 * The same key names the line in the browser cart and the account cart (D-192).
 */
export const lineKeySchema = z
  .string()
  .regex(/^(item:[A-Z0-9][A-Z0-9-]*|bundle:[a-z0-9][a-z0-9-]*)$/, 'Not a cart line');
export type LineKey = z.infer<typeof lineKeySchema>;

const qtySchema = z.number().int().min(1).max(MAX_LINE_QTY);

/** A stored line: what and how many. Prices are never stored in a cart (D-56, D-194). */
export const cartEntrySchema = z.object({ key: lineKeySchema, qty: qtySchema });
export type CartEntry = z.infer<typeof cartEntrySchema>;

/** Coupon codes as typed; matched case-insensitively. */
export const couponCodeSchema = z.string().trim().min(1).max(40);

/** `POST /cart/quote`: prices a browser cart (D-192). `add` adds a line first. */
export const cartQuoteRequestSchema = z.object({
  lines: z
    .array(z.object({ key: lineKeySchema, qty: z.number().int().min(1) }))
    .max(MAX_CART_LINES),
  couponCode: couponCodeSchema.optional(),
  pincode: pincodeSchema.optional(),
  add: cartEntrySchema.optional(),
});
export type CartQuoteRequest = z.infer<typeof cartQuoteRequestSchema>;

/** `POST /me/cart/merge`: the browser cart joins the account cart at sign-in (D-192). */
export const cartMergeRequestSchema = z.object({
  lines: z
    .array(z.object({ key: lineKeySchema, qty: z.number().int().min(1) }))
    .max(MAX_CART_LINES),
  couponCode: couponCodeSchema.optional(),
});
export type CartMergeRequest = z.infer<typeof cartMergeRequestSchema>;

/** Why a line can't be bought as it stands (D-198). Never a stock count (D-148). */
export const cartLineStatusSchema = z.enum(['ok', 'notEnoughStock', 'outOfStock', 'unavailable']);
export type CartLineStatus = z.infer<typeof cartLineStatusSchema>;

const lineDeliverySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('notDeliverable') }),
  z.object({ status: z.literal('outOfStockHere') }),
  /** IST dates; an estimate, not a promise (D-52). */
  z.object({ status: z.literal('deliverable'), from: z.string(), to: z.string() }),
]);
export type LineDelivery = z.infer<typeof lineDeliverySchema>;

const cartProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  sku: z.string().min(1),
  options: z.record(z.string(), z.string()),
  image: productImageSchema.nullable(),
  /** Plain-language policy for this item (D-84). */
  returnPolicy: z.string().min(1),
});

/** A cart line as shown (D-84, D-194, D-198). Amounts come from `priceCart`. */
export const cartLineViewSchema = z.object({
  key: lineKeySchema,
  kind: z.enum(['item', 'bundle']),
  qty: z.number().int().positive(),
  /** Highest quantity the stepper offers: the line limit, or what we can supply if less. */
  maxQty: z.number().int().min(1).max(MAX_LINE_QTY),
  status: cartLineStatusSchema,
  name: z.string().min(1),
  /** Items: the variant. Bundles: null (see `members`). */
  product: cartProductSchema.nullable(),
  /** Bundles: what is inside (D-38). */
  members: z.array(cartProductSchema.extend({ qty: z.number().int().positive() })),
  isPreorder: z.boolean(),
  /** Regular unit price; the bundle price for bundles. */
  unitPricePaise: paiseSchema,
  /** One unit at the live flash price (D-142, D-194); gone when the sale ends (D-140). */
  flash: z.object({ unitPricePaise: paiseSchema, endsAt: epochMsSchema }).nullable(),
  /** What the line costs before offers; 0 when it can't be bought. */
  linePaise: paiseSchema,
  couponDiscountPaise: paiseSchema,
  /** At the cart's pincode; null without one or when the line can't be bought. */
  delivery: lineDeliverySchema.nullable(),
});
export type CartLineView = z.infer<typeof cartLineViewSchema>;

export const cartCouponSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('applied'),
    code: z.string().min(1),
    name: z.string().min(1),
    discountPaise: paiseSchema,
  }),
  /** Kept on the cart; applies again once the cart qualifies (D-195). */
  z.object({ status: z.literal('notApplied'), code: z.string().min(1), reason: z.string().min(1) }),
]);
export type CartCoupon = z.infer<typeof cartCouponSchema>;

/** A coupon the customer could apply: never applied for them (D-06, D-195). */
export const couponPreviewSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  validTo: epochMsSchema,
  savingPaise: paiseSchema.nullable(),
  /** Why it doesn't apply to this cart; null when it does. */
  reason: z.string().min(1).nullable(),
});
export type CouponPreview = z.infer<typeof couponPreviewSchema>;

/** What a payment offer would save at payment on this cart; none is selected (D-35, D-196). */
export const paymentOfferPreviewSchema = z.object({
  id: idSchema,
  kind: z.enum(['bank', 'noCostEmi']),
  name: z.string().min(1),
  validTo: epochMsSchema,
  savingPaise: paiseSchema.nullable(),
  reason: z.string().min(1).nullable(),
});
export type PaymentOfferPreview = z.infer<typeof paymentOfferPreviewSchema>;

export const suggestionSchema = z.object({
  product: productSummarySchema,
  reason: z.string().min(1),
  /** Line to add straight from the suggestion: only for a product with one variant in stock. */
  addKey: lineKeySchema.nullable(),
});
export type CartSuggestion = z.infer<typeof suggestionSchema>;

/** `GET /me/cart`, `POST /cart/quote` and every cart write. */
export const cartViewSchema = z.object({
  lines: z.array(cartLineViewSchema),
  /** Units across all lines (header badge). */
  count: z.number().int().nonnegative(),
  subtotalPaise: paiseSchema,
  coupon: cartCouponSchema.nullable(),
  totalPaise: paiseSchema,
  /** "from ₹X/mo" on the total (D-33, D-196). */
  emiFromPaise: paiseSchema.optional(),
  coupons: z.array(couponPreviewSchema),
  paymentOffers: z.array(paymentOfferPreviewSchema),
  /** Delivery at a pincode (D-55); null when none was given. */
  delivery: z
    .object({
      pincode: pincodeSchema,
      place: z.object({ city: z.string(), state: z.string() }).nullable(),
      /** Whether the order could be paid cash on delivery (D-70, D-71). */
      cod: z.object({ allowed: z.boolean(), reasons: z.array(codBlockSchema) }),
    })
    .nullable(),
  /** Cart cross-sell, each with a reason, at most 4 (D-123, D-124). */
  suggestions: z.array(suggestionSchema),
  /** False while any line needs attention (D-198). */
  canCheckout: z.boolean(),
});
export type CartView = z.infer<typeof cartViewSchema>;

/** After an add: the cart plus add-to-cart suggestions for what was added (D-124, D-199). */
export const cartAddResultSchema = z.object({
  cart: cartViewSchema,
  added: z.object({ key: lineKeySchema, suggestions: z.array(suggestionSchema) }),
});
export type CartAddResult = z.infer<typeof cartAddResultSchema>;

/** `POST /cart/quote`: the priced browser cart, plus suggestions when a line was added. */
export const cartQuoteResponseSchema = z.object({
  cart: cartViewSchema,
  added: cartAddResultSchema.shape.added.nullable(),
});
export type CartQuoteResponse = z.infer<typeof cartQuoteResponseSchema>;
