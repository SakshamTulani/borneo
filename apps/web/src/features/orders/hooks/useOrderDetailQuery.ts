import { useQuery } from '@tanstack/react-query';
import { orderDetailQuery } from '../repository/ordersRepository';

export function useOrderDetailQuery(id: string) {
  return useQuery(orderDetailQuery(id));
}
