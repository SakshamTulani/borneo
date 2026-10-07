import { useInfiniteQuery } from '@tanstack/react-query';
import { ordersQuery } from '../repository/ordersRepository';

export function useOrdersQuery() {
  return useInfiniteQuery(ordersQuery);
}
