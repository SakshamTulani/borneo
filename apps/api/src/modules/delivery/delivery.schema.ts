import { z } from 'zod';
import {
  deliveryCheckSchema,
  errorResponseSchema,
  geoPointSchema,
  pincodeAreaSchema,
  pincodeSchema,
} from '@borneo/shared';

/** Bounds the query only; not a purchase limit (D-61 is still open). */
export const DELIVERY_QTY_MAX = 10;

export const deliveryQuery = z.object({
  sku: z.string().trim().min(1).max(64),
  /** Not validated here: an invalid pincode is a result the PDP shows (D-50). */
  pincode: z.string().trim().max(10),
  qty: z.coerce.number().int().min(1).max(DELIVERY_QTY_MAX).default(1),
});

export const pincodeAtQuery = z.object({
  lat: z.coerce.number().pipe(geoPointSchema.shape.lat),
  lng: z.coerce.number().pipe(geoPointSchema.shape.lng),
});

export const pincodeParams = z.object({ pincode: pincodeSchema });

export const deliveryResponse = deliveryCheckSchema;
export const pincodeAtResponse = pincodeAreaSchema;

export { errorResponseSchema };
