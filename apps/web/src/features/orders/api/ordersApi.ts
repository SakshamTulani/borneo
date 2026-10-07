import {
  orderPageSchema,
  orderViewSchema,
  returnPageSchema,
  returnRequestViewSchema,
  type OrderPage,
  type OrderView,
  type ReturnRequestInput,
  type ReturnRequestView,
} from '@borneo/shared';
import { getJson, sendJson } from '../../../shared/lib/http';

const id = encodeURIComponent;

export const getOrders = (cursor?: string): Promise<OrderPage> =>
  getJson(`/me/orders?limit=10${cursor ? `&cursor=${id(cursor)}` : ''}`, orderPageSchema);

export const getOrder = (orderId: string): Promise<OrderView> =>
  getJson(`/me/orders/${id(orderId)}`, orderViewSchema);

export const postCancel = (orderId: string): Promise<OrderView> =>
  sendJson('POST', `/me/orders/${id(orderId)}/cancel`, undefined, orderViewSchema);

/** Demo only: the demo courier's next step (D-215). */
export const postAdvance = (orderId: string): Promise<OrderView> =>
  sendJson('POST', `/me/orders/${id(orderId)}/demo/advance`, undefined, orderViewSchema);

export const postReturn = (
  orderId: string,
  itemId: string,
  input: ReturnRequestInput,
): Promise<ReturnRequestView> =>
  sendJson(
    'POST',
    `/me/orders/${id(orderId)}/items/${id(itemId)}/returns`,
    input,
    returnRequestViewSchema,
  );

export const getReturns = (): Promise<{ items: ReturnRequestView[] }> =>
  getJson('/me/returns', returnPageSchema);

/** Demo only: the demo support desk's next step (D-219). */
export const postReturnAdvance = (returnId: string): Promise<ReturnRequestView> =>
  sendJson('POST', `/me/returns/${id(returnId)}/demo/advance`, undefined, returnRequestViewSchema);

export const invoiceHref = (orderId: string) => `/api/me/orders/${id(orderId)}/invoice`;
