import { useInfiniteQuery } from '@tanstack/react-query';
import { returnsQuery } from '../repository/ordersRepository';

export function useReturnsQuery() {
  return useInfiniteQuery(returnsQuery);
}
