import { z } from 'zod';
import { idSchema } from './common';

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

export const addressPinSchema = z.object({
  pincode: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type AddressPin = z.infer<typeof addressPinSchema>;
