import { useQuery } from '@tanstack/react-query';
import { orderQuery } from '../repository/checkoutRepository';

export function useOrderQuery(id: string) {
  return useQuery(orderQuery(id));
}
