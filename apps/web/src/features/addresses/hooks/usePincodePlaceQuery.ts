import { isValidPincode } from '@borneo/shared';
import { useQuery } from '@tanstack/react-query';
import { pincodePlaceQuery } from '@/features/delivery';

/** Place and centre for a typed pincode, once it has 6 digits. */
export function usePincodePlaceQuery(pincode: string) {
  const valid = isValidPincode(pincode);
  return useQuery({ ...pincodePlaceQuery(valid ? pincode : ''), enabled: valid });
}
