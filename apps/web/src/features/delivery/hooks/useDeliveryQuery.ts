import { isValidPincode } from '@borneo/shared';
import { useQuery } from '@tanstack/react-query';
import { deliveryQuery } from '../repository/deliveryRepository';

/** Runs only for a well-formed pincode; malformed ones never reach the API. */
export function useDeliveryQuery(sku: string, pincode: string | null) {
  const valid = pincode !== null && isValidPincode(pincode);
  return useQuery({ ...deliveryQuery(sku, valid ? pincode : ''), enabled: valid });
}
