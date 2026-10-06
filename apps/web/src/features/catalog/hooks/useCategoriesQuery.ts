import { useQuery } from '@tanstack/react-query';
import { categoriesQuery } from '../repository/catalogRepository';

export function useCategoriesQuery() {
  return useQuery(categoriesQuery);
}
