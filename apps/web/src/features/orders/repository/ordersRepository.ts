import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { ReturnRequestInput } from '@borneo/shared';
import {
  getOrder,
  getOrders,
  getReturns,
  invoiceHref,
  postAdvance,
  postCancel,
  postReturn,
  postReturnAdvance,
} from '../api/ordersApi';

/** The account's orders, newest first. Under `['me']` (dropped when the session changes). */
export const ordersQuery = infiniteQueryOptions({
  queryKey: ['me', 'orders', 'list'],
  queryFn: ({ pageParam }) => getOrders(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});

/** One order with tracking, returns and refunds; same key as the checkout's order query. */
export const orderDetailQuery = (id: string) =>
  queryOptions({ queryKey: ['me', 'orders', id], queryFn: () => getOrder(id) });

export const returnsQuery = queryOptions({
  queryKey: ['me', 'returns'],
  queryFn: getReturns,
});

export const cancelOrder = postCancel;
export const advanceOrder = postAdvance;
export const advanceReturn = postReturnAdvance;
export const requestReturn = ({
  orderId,
  itemId,
  input,
}: {
  orderId: string;
  itemId: string;
  input: ReturnRequestInput;
}) => postReturn(orderId, itemId, input);

/** A photo file as base64 (no data-URL prefix), for the JSON request (D-218). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the photo'));
    reader.readAsDataURL(file);
  });
}

export { invoiceHref };
