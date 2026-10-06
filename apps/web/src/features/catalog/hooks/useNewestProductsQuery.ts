import { useQuery } from '@tanstack/react-query';
import { newestProductsQuery } from '../repository/catalogRepository';

export function useNewestProductsQuery(limit: number) {
  return useQuery(newestProductsQuery(limit));
}
