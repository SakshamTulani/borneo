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
});

export const searchResponse = searchResultSchema;

export { errorResponseSchema };
