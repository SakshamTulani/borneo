import { useQuery } from '@tanstack/react-query';
import { liveOffersQuery } from '../repository/offersRepository';

export function useLiveOffersQuery() {
  return useQuery(liveOffersQuery);
}
