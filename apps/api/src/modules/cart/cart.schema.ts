import { z } from 'zod';
import {
  MAX_LINE_QTY,
  cartAddResultSchema,
  cartEntrySchema,
  cartMergeRequestSchema,
  cartQuoteRequestSchema,
  cartQuoteResponseSchema,
  cartViewSchema,
  couponCodeSchema,
  errorResponseSchema,
  lineKeySchema,
  pincodeSchema,
} from '@borneo/shared';

/** Delivery and COD in the cart are for this pincode (D-55). */
export const cartQuery = z.object({ pincode: pincodeSchema.optional() });
export const lineParams = z.object({ key: lineKeySchema });
export const qtyBody = z.object({ qty: z.number().int().min(1).max(MAX_LINE_QTY) });
export const couponBody = z.object({ code: couponCodeSchema });
export const quoteResponse = cartQuoteResponseSchema;

export {
  cartAddResultSchema,
  cartEntrySchema,
  cartMergeRequestSchema,
  cartQuoteRequestSchema,
  cartViewSchema,
  errorResponseSchema,
};
