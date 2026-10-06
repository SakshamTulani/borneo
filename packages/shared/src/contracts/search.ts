import { z } from 'zod';
import { paiseSchema } from './common';
import { productSummarySchema } from './catalog';

export const SEARCH_QUERY_MAX = 100;
export const SEARCH_LIMIT_MAX = 24;

export const searchCategorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
});
export type SearchCategory = z.infer<typeof searchCategorySchema>;

/** `GET /search?q=&limit=`: suggestions use a small limit, the results page a larger one. */
export const searchResultSchema = z.object({
  query: z.string(),
  /** Exact model name, model number or SKU: the client opens the PDP (D-110). */
  exactMatch: z.object({ slug: z.string().min(1), sku: z.string().min(1).nullable() }).nullable(),
  /** How the query was read: text, price cap (D-113) and the category it names, if any. */
  interpretation: z.object({
    text: z.string(),
    maxPricePaise: paiseSchema.optional(),
    category: searchCategorySchema.optional(),
  }),
  /** Matching categories (D-112). */
  categories: z.array(searchCategorySchema),
  /** Listed products, best match first, with price and stock (D-112). */
  products: z.array(productSummarySchema),
  /** Only when nothing matched (D-114): same-category alternatives and categories to browse. */
  fallback: z
    .object({
      alternatives: z.array(productSummarySchema),
      categories: z.array(searchCategorySchema),
    })
    .nullable(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;
