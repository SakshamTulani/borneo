import { useMutation } from '@tanstack/react-query';
import { fetchPincodeAt } from '../repository/deliveryRepository';

export function usePinLookupMutation() {
  return useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => fetchPincodeAt(lat, lng),
  });
}
