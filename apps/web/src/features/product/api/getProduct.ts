import { productDetailSchema, type ProductDetail } from '@borneo/shared';
import { getJson, isApiError } from '../../../shared/lib/http';

/** Null when there is no such product (404), so the route can render not-found. */
export async function getProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return await getJson(`/products/${encodeURIComponent(slug)}`, productDetailSchema);
  } catch (e) {
    if (isApiError(e, 404)) return null;
    throw e;
  }
}
