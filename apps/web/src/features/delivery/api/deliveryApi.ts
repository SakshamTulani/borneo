import {
  deliveryCheckSchema,
  pincodeAreaSchema,
  type DeliveryCheck,
  type PincodeArea,
} from '@borneo/shared';
import { getJson, isApiError } from '../../../shared/lib/http';

export async function getDelivery(sku: string, pincode: string): Promise<DeliveryCheck> {
  const params = new URLSearchParams({ sku, pincode });
  return getJson(`/delivery?${params.toString()}`, deliveryCheckSchema);
}

/** Null when no known pincode is near the pin (404 PINCODE_NOT_FOUND). */
export async function getPincodeAt(lat: number, lng: number): Promise<PincodeArea | null> {
  const params = new URLSearchParams({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
  try {
    return await getJson(`/pincodes/at?${params.toString()}`, pincodeAreaSchema);
  } catch (e) {
    if (isApiError(e, 404)) return null;
    throw e;
  }
}
