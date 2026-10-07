import { useQuery } from '@tanstack/react-query';
import { returnsQuery } from '../repository/ordersRepository';

export function useReturnsQuery() {
  return useQuery(returnsQuery);
}
