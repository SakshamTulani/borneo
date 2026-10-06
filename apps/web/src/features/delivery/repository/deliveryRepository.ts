import { queryOptions } from '@tanstack/react-query';
import { getDelivery, getPincodeArea, getPincodeAt } from '../api/deliveryApi';
import { toDeliveryView, toPinnedPincode } from '../mappers/toDeliveryView';
import type { PincodePlace, PinnedPincode } from '../model';

/** Estimate for one variant at one pincode (D-50–55). */
export const deliveryQuery = (sku: string, pincode: string) =>
  queryOptions({
    queryKey: ['delivery', sku, pincode],
    queryFn: async () => toDeliveryView(await getDelivery(sku, pincode)),
    // Short: a flash sale going live turns COD off (D-186).
    staleTime: 15_000,
  });

/** The pincode under a map pin (D-184); null when none is close enough. */
export async function fetchPincodeAt(lat: number, lng: number): Promise<PinnedPincode | null> {
  const area = await getPincodeAt(lat, lng);
  return area ? toPinnedPincode(area) : null;
}

/** A known pincode's place and centre (D-189); null when we don't know it. */
export const pincodePlaceQuery = (pincode: string) =>
  queryOptions({
    queryKey: ['pincode', pincode],
    queryFn: async (): Promise<PincodePlace | null> => (await getPincodeArea(pincode)) ?? null,
    staleTime: 60 * 60_000,
  });
