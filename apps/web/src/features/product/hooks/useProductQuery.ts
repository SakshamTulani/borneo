import { useQuery } from '@tanstack/react-query';
import { productQuery } from '../repository/productRepository';

export function useProductQuery(slug: string) {
  return useQuery(productQuery(slug));
}
