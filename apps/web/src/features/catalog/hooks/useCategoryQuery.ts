import { useQuery } from '@tanstack/react-query';
import { categoryQuery } from '../repository/catalogRepository';

export function useCategoryQuery(slug: string) {
  return useQuery(categoryQuery(slug));
}
