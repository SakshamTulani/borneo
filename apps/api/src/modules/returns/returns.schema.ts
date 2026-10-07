import { z } from 'zod';
import {
  errorResponseSchema,
  returnPageSchema,
  returnRequestInputSchema,
  returnRequestViewSchema,
} from '@borneo/shared';

export const itemParams = z.object({ orderId: z.uuid(), itemId: z.uuid() });
export const returnParams = z.object({ id: z.uuid() });
export const photoParams = z.object({ id: z.uuid(), photoId: z.uuid() });
export const imageResponse = z.instanceof(Buffer);

/** Up to 3 photos of 2 MB each, base64 in JSON (D-217, D-218). */
export const RETURN_BODY_LIMIT = 10 * 1024 * 1024;

export const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  413: errorResponseSchema,
  422: errorResponseSchema,
};

export { returnPageSchema, returnRequestInputSchema, returnRequestViewSchema };
