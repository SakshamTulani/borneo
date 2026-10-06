import { useMutation } from '@tanstack/react-query';
import { fetchPincodeAt } from '@/features/delivery';

/** The pincode under a placed pin (D-184), to fill an empty pincode field. */
export function usePinPincodeMutation() {
  return useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => fetchPincodeAt(lat, lng),
  });
}
