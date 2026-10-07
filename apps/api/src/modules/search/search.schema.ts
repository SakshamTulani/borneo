import { z } from 'zod';
import {
  errorResponseSchema,
  SEARCH_LIMIT_MAX,
  SEARCH_QUERY_MAX,
  searchResultSchema,
} from '@borneo/shared';

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(SEARCH_QUERY_MAX),
  limit: z.coerce.number().int().min(1).max(SEARCH_LIMIT_MAX).default(SEARCH_LIMIT_MAX),
  /** Opaque to clients: where the next page starts in the ranked matches. */
  cursor: z
    .string()
    .regex(/^[0-9]{1,4}$/, 'Cursor is invalid')
    .optional(),
});

export const searchResponse = searchResultSchema;

export { errorResponseSchema };
