import {
  checkoutViewSchema,
  orderViewSchema,
  type CheckoutQuery,
  type CheckoutView,
  type MockPaymentRequest,
  type OrderView,
  type PlaceOrderRequest,
} from '@borneo/shared';
import { getJson, sendJson } from '../../../shared/lib/http';

const search = (query: CheckoutQuery) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined) params.set(k, String(v));
  const s = params.toString();
  return s ? `?${s}` : '';
};

export const getCheckout = (query: CheckoutQuery): Promise<CheckoutView> =>
  getJson(`/me/checkout${search(query)}`, checkoutViewSchema);

/** Placing is idempotent: the same key always answers with the same order. */
export const postOrder = (key: string, request: PlaceOrderRequest): Promise<OrderView> =>
  sendJson('POST', '/me/orders', request, orderViewSchema, { 'Idempotency-Key': key });

export const getOrder = (id: string): Promise<OrderView> =>
  getJson(`/me/orders/${encodeURIComponent(id)}`, orderViewSchema);

export const postRetry = (id: string): Promise<OrderView> =>
  sendJson('POST', `/me/orders/${encodeURIComponent(id)}/payments`, undefined, orderViewSchema);

/** Demo only: the mock gateway's buttons (D-213). */
export const postMockPayment = (
  id: string,
  attemptId: string,
  request: MockPaymentRequest,
): Promise<OrderView> =>
  sendJson(
    'POST',
    `/me/orders/${encodeURIComponent(id)}/payments/${encodeURIComponent(attemptId)}/mock`,
    request,
    orderViewSchema,
  );

/** The browser downloads the PDF straight from the API (cookie session). */
export const invoiceHref = (id: string) => `/api/me/orders/${encodeURIComponent(id)}/invoice`;
