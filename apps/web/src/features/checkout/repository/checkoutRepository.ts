import { queryOptions } from '@tanstack/react-query';
import { HOLD_DURATION_MS, type MockPaymentRequest, type PlaceOrderRequest } from '@borneo/shared';
import { mergeBrowserCartOnce } from '@/features/cart';
import {
  getCheckout,
  getOrder,
  invoiceHref,
  postMockPayment,
  postBotCheck,
  postOrder,
  postRetry,
} from '../api/checkoutApi';
import type { CheckoutChoice, OrderView } from '../model';

/**
 * Checkout for the account cart with the customer's choices. Under `['me']` (dropped when the
 * session changes); rechecked on every address or payment change (D-55).
 */
export const checkoutQuery = (choice: CheckoutChoice) =>
  queryOptions({
    queryKey: ['me', 'checkout', choice],
    // A cart filled before signing in joins the account first (D-192).
    queryFn: async () => {
      await mergeBrowserCartOnce();
      return getCheckout(choice);
    },
    staleTime: 10_000,
  });

const LATE_WATCH_MS = 60_000;

/** While payment is pending, poll: a late payment or the hold's end changes the order (D-57, D-59). */
export const orderQuery = (id: string) =>
  queryOptions({
    queryKey: ['me', 'orders', id],
    queryFn: () => getOrder(id),
    refetchInterval: (q) => {
      const order = q.state.data as OrderView | undefined;
      if (order?.status === 'pending_payment') return 3_000;
      // A cancelled order can still be confirmed or refunded by a late payment (D-59): watch
      // for a minute after the hold window, then stop.
      return order?.status === 'cancelled' &&
        Date.now() < order.placedAt + HOLD_DURATION_MS + LATE_WATCH_MS
        ? 3_000
        : false;
    },
  });

/** One key per checkout attempt, so a double click or a retry after a lost answer can't order twice. */
export const newIdempotencyKey = () => `ord-${globalThis.crypto.randomUUID().replaceAll('-', '')}`;

export const placeOrder = ({
  key,
  request,
  botToken,
}: {
  key: string;
  request: PlaceOrderRequest;
  botToken?: string | undefined;
}) => postOrder(key, request, botToken);
export const botCheck = postBotCheck;
export const retryPayment = postRetry;
export const mockPayment = ({
  id,
  attemptId,
  result,
}: { id: string; attemptId: string } & MockPaymentRequest) =>
  postMockPayment(id, attemptId, { result });
export { invoiceHref };
