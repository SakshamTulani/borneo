import { useQuery } from '@tanstack/react-query';
import { compareQuery } from '../repository/compareRepository';

export function useCompareQuery(category: string, slugs: string[]) {
  return useQuery(compareQuery(category, slugs));
}
