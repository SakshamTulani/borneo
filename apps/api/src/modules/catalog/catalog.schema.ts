import { z } from 'zod';
import {
  categoryDetailSchema,
  categoryDtoSchema,
  errorResponseSchema,
  MAX_PAGE_LIMIT,
  pageSchema,
  paiseSchema,
  productDetailSchema,
  productSortSchema,
  productSummarySchema,
} from '@borneo/shared';

const slug = z.string().regex(/^[a-z0-9-]+$/);

export const categoryListResponse = z.object({ items: z.array(categoryDtoSchema) });
export type CategoryListResponse = z.infer<typeof categoryListResponse>;

export const slugParams = z.object({ slug });

/**
 * Known params; every other param is a category filter named by attribute key (api-design.md),
 * validated against the category's config by the service (D-18).
 */
export const productListQuery = z
  .object({
    category: slug.optional(),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(24),
    sort: productSortSchema.default('newest'),
    maxPricePaise: z.coerce.number().pipe(paiseSchema).optional(),
  })
  .catchall(z.string())
  .transform(({ category, cursor, limit, sort, maxPricePaise, ...filters }) => ({
    ...(category !== undefined ? { category } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
    limit,
    sort,
    ...(maxPricePaise !== undefined ? { maxPricePaise } : {}),
    filters: filters as Record<string, string>,
  }));
export type ProductListQuery = z.output<typeof productListQuery>;

export const productListResponse = pageSchema(productSummarySchema);
export type ProductListResponse = z.infer<typeof productListResponse>;

export const categoryDetailResponse = categoryDetailSchema;
export const productDetailResponse = productDetailSchema;

export { errorResponseSchema };
