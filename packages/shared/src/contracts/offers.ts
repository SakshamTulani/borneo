import { z } from 'zod';
import { bpsSchema, epochMsSchema, idSchema, paiseSchema } from './common';

const window = { validFrom: epochMsSchema, validTo: epochMsSchema };

const discount = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('flat'), amountPaise: paiseSchema }),
  z.object({ kind: z.literal('percent'), bps: bpsSchema, maxPaise: paiseSchema.optional() }),
]);
export type Discount = z.infer<typeof discount>;

/** Coupon shapes: flat or %, optional min order, optional category scope (D-40). */
export const couponSchema = z.object({
  id: idSchema,
  code: z.string().min(1),
  name: z.string().min(1),
  discount,
  minOrderPaise: paiseSchema.optional(),
  categoryIds: z.array(idSchema).optional(),
  ...window,
});
export type Coupon = z.infer<typeof couponSchema>;

export const paymentMethodSchema = z.enum(['upi', 'card', 'emi', 'cod']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentSelectionSchema = z.object({
  method: paymentMethodSchema,
  bank: z.string().optional(),
  tenureMonths: z.number().int().positive().optional(),
});
export type PaymentSelection = z.infer<typeof paymentSelectionSchema>;

const paymentOfferBase = {
  id: idSchema,
  name: z.string().min(1),
  banks: z.array(z.string()).optional(),
  minOrderPaise: paiseSchema.optional(),
  categoryIds: z.array(idSchema).optional(),
  /** True when everyone paying this way gets it: enables the effective-price line (D-32). */
  appliesToAll: z.boolean(),
  ...window,
};

/** One payment offer per order; no-cost EMI uses the same slot (D-35). */
export const paymentOfferSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('bank'),
    methods: z.array(paymentMethodSchema.exclude(['cod'])).min(1),
    discount,
    ...paymentOfferBase,
  }),
  z.object({
    kind: z.literal('noCostEmi'),
    tenureMonths: z.number().int().positive(),
    /** The bank's rate; the discount equals the interest it would charge (D-45). */
    annualRateBps: z.number().int().positive(),
    ...paymentOfferBase,
  }),
]);
export type PaymentOffer = z.infer<typeof paymentOfferSchema>;

export const flashSaleSchema = z
  .object({
    id: idSchema,
    variantId: idSchema,
    salePricePaise: paiseSchema,
    startsAt: epochMsSchema,
    endsAt: epochMsSchema,
    cap: z.number().int().positive(),
    sold: z.number().int().nonnegative(),
    perCustomerLimit: z.literal(1),
  })
  .refine((s) => s.endsAt > s.startsAt, 'endsAt must be after startsAt');
export type FlashSale = z.infer<typeof flashSaleSchema>;
