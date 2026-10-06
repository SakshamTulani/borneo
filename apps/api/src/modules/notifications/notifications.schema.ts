import { z } from 'zod';
import { errorResponseSchema, MAX_PAGE_LIMIT, notificationPageSchema } from '@borneo/shared';

export const notificationsQuery = z.object({
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(20),
});

/** 204 responses have no body. */
export const noContent = z.null();

export const notificationParams = z.object({ id: z.uuid() });

export { errorResponseSchema, notificationPageSchema };
