import { z } from 'zod';
import {
  addressInputSchema,
  addressListSchema,
  addressSchema,
  errorResponseSchema,
} from '@borneo/shared';

/** 204 responses have no body. */
export const noContent = z.null();

export const addressParams = z.object({ id: z.uuid() });

export { addressInputSchema, addressListSchema, addressSchema, errorResponseSchema };
