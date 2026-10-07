import { z } from 'zod';
import { analyticsBatchSchema, errorResponseSchema } from '@borneo/shared';

export const noContent = z.null();
export const errors = { 400: errorResponseSchema, 429: errorResponseSchema };
export { analyticsBatchSchema };
