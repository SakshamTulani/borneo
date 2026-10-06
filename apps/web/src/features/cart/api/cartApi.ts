import {
  cartAddResultSchema,
  cartQuoteResponseSchema,
  cartViewSchema,
  type CartAddResult,
  type CartEntry,
  type CartMergeRequest,
  type CartQuoteRequest,
  type CartQuoteResponse,
  type CartView,
} from '@borneo/shared';
import { getJson, sendJson } from '../../../shared/lib/http';

const at = (pincode: string | null) => (pincode ? `?pincode=${pincode}` : '');
const line = (key: string) => `/me/cart/lines/${encodeURIComponent(key)}`;

/** Prices a browser cart (signed out); nothing is stored on the server. */
export const postQuote = (request: CartQuoteRequest): Promise<CartQuoteResponse> =>
  sendJson('POST', '/cart/quote', request, cartQuoteResponseSchema);

export const getCart = (pincode: string | null): Promise<CartView> =>
  getJson(`/me/cart${at(pincode)}`, cartViewSchema);

export const postLine = (entry: CartEntry, pincode: string | null): Promise<CartAddResult> =>
  sendJson('POST', `/me/cart/lines${at(pincode)}`, entry, cartAddResultSchema);

export const patchLine = (key: string, qty: number, pincode: string | null): Promise<CartView> =>
  sendJson('PATCH', `${line(key)}${at(pincode)}`, { qty }, cartViewSchema);

export const deleteLine = (key: string, pincode: string | null): Promise<CartView> =>
  sendJson('DELETE', `${line(key)}${at(pincode)}`, undefined, cartViewSchema);

export const putCoupon = (code: string, pincode: string | null): Promise<CartView> =>
  sendJson('PUT', `/me/cart/coupon${at(pincode)}`, { code }, cartViewSchema);

export const deleteCoupon = (pincode: string | null): Promise<CartView> =>
  sendJson('DELETE', `/me/cart/coupon${at(pincode)}`, undefined, cartViewSchema);

export const postMerge = (request: CartMergeRequest, pincode: string | null): Promise<CartView> =>
  sendJson('POST', `/me/cart/merge${at(pincode)}`, request, cartViewSchema);
