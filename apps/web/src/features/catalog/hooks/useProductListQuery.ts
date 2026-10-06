import { useInfiniteQuery } from '@tanstack/react-query';
import { productListQuery } from '../repository/catalogRepository';

export function useProductListQuery(params: Record<string, string>) {
  return useInfiniteQuery(productListQuery(params));
}
