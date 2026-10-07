import { useQuery } from '@tanstack/react-query';
import { dealsQuery } from '../repository/dealsRepository';

export function useDealsQuery() {
  return useQuery(dealsQuery);
}
