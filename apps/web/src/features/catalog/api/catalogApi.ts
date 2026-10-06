import { z } from 'zod';
import {
  categoryDetailSchema,
  categoryDtoSchema,
  pageSchema,
  productSummarySchema,
  type CategoryDetail,
  type CategoryDto,
  type ProductSummary,
} from '@borneo/shared';
import { getJson, isApiError } from '../../../shared/lib/http';

const categoryList = z.object({ items: z.array(categoryDtoSchema) });
const productPage = pageSchema(productSummarySchema);
export type ProductPageDto = { items: ProductSummary[]; nextCursor: string | null };

export async function getCategories(): Promise<CategoryDto[]> {
  return (await getJson('/categories', categoryList)).items;
}

/** Null when the category does not exist (404). */
export async function getCategory(slug: string): Promise<CategoryDetail | null> {
  try {
    return await getJson(`/categories/${encodeURIComponent(slug)}`, categoryDetailSchema);
  } catch (e) {
    if (isApiError(e, 404)) return null;
    throw e;
  }
}

/** `params` are API query params: category, sort, maxPricePaise, cursor, limit and filters. */
export async function getProducts(params: Record<string, string>): Promise<ProductPageDto> {
  return getJson(`/products?${new URLSearchParams(params).toString()}`, productPage);
}
