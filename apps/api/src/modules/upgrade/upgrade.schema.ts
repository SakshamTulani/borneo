import { z } from 'zod';
import { errorResponseSchema, upgradeForProductSchema, upgradeStripSchema } from '@borneo/shared';

export const slugParams = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) });
export const errors = { 400: errorResponseSchema, 401: errorResponseSchema };
export { upgradeForProductSchema, upgradeStripSchema };
