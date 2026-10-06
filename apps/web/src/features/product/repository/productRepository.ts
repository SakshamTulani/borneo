import { queryOptions } from '@tanstack/react-query';
import { getProduct } from '../api/getProduct';

/** Product page data; null for an unknown product. */
export const productQuery = (slug: string) =>
  queryOptions({ queryKey: ['product', slug], queryFn: () => getProduct(slug), staleTime: 30_000 });
