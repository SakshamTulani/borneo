import { z } from 'zod';
import { idSchema, pincodeSchema } from './common';

export const serviceabilityRowSchema = z.object({
  pincode: z.string(),
  categoryId: idSchema,
  deliverable: z.boolean(),
  codAllowed: z.boolean(),
});
export type ServiceabilityRow = z.infer<typeof serviceabilityRowSchema>;

export const warehouseStockSchema = z.object({
  warehouseId: idSchema,
  /** on_hand − reserved */
  available: z.number().int().nonnegative(),
});
export type WarehouseStock = z.infer<typeof warehouseStockSchema>;

export const deliveryLaneSchema = z
  .object({
    warehouseId: idSchema,
    /** Matches pincodes starting with this prefix; longest prefix wins. "" matches all. */
    pincodePrefix: z.string().regex(/^[0-9]{0,6}$/),
    minDays: z.number().int().nonnegative(),
    maxDays: z.number().int().nonnegative(),
  })
  .refine((l) => l.maxDays >= l.minDays, 'maxDays must be ≥ minDays');
export type DeliveryLane = z.infer<typeof deliveryLaneSchema>;

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

export const addressPinSchema = geoPointSchema.extend({ pincode: z.string() });
export type AddressPin = z.infer<typeof addressPinSchema>;

/** A known pincode with its centre, used to resolve map pins (D-184). */
export const pincodeAreaSchema = geoPointSchema.extend({
  pincode: pincodeSchema,
  city: z.string(),
  state: z.string(),
});
export type PincodeArea = z.infer<typeof pincodeAreaSchema>;

/** Why COD is off for this line: the pincode, a pre-order or a live flash sale (D-70, D-71). */
export const codBlockSchema = z.enum(['PINCODE', 'PREORDER', 'FLASH_SALE', 'ORDER_VALUE']);

/** `GET /delivery`: estimate for one variant at one pincode (D-50–55). */
export const deliveryCheckSchema = z.object({
  pincode: z.string(),
  /** Place name when the pincode is known; null for an unknown one. */
  place: z.object({ city: z.string(), state: z.string() }).nullable(),
  estimate: z.discriminatedUnion('status', [
    z.object({ status: z.literal('invalidPincode') }),
    z.object({ status: z.literal('notDeliverable') }),
    z.object({ status: z.literal('outOfStockHere') }),
    z.object({
      status: z.literal('deliverable'),
      /** IST dates, "YYYY-MM-DD"; an estimate, not a promise (D-52). */
      from: z.string(),
      to: z.string(),
      cod: z.object({ allowed: z.boolean(), reasons: z.array(codBlockSchema) }),
    }),
  ]),
});
export type DeliveryCheck = z.infer<typeof deliveryCheckSchema>;
