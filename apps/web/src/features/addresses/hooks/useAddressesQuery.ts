import { useQuery } from '@tanstack/react-query';
import { addressesQuery } from '../repository/addressesRepository';

export function useAddressesQuery() {
  return useQuery(addressesQuery);
}
