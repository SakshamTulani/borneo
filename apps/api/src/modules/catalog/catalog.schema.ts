import { z } from 'zod';
import {
  categoryDtoSchema,
  errorResponseSchema,
  MAX_PAGE_LIMIT,
  pageSchema,
  productSummarySchema,
} from '@borneo/shared';

export const categoryListResponse = z.object({ items: z.array(categoryDtoSchema) });
export type CategoryListResponse = z.infer<typeof categoryListResponse>;

export const productListQuery = z.object({
  category: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(24),
});
export type ProductListQuery = z.infer<typeof productListQuery>;

export const productListResponse = pageSchema(productSummarySchema);
export type ProductListResponse = z.infer<typeof productListResponse>;

export { errorResponseSchema };
