import type {
  OrderPage,
  OrderSummary,
  OrderView,
  ReturnRequestInput,
  ReturnRequestView,
  TrackingView,
} from '@borneo/shared';

export type { OrderPage, OrderSummary, OrderView, ReturnRequestView, TrackingView };
export type OrderItem = OrderView['items'][number];

/** What the return dialog collects; photos are files until sent (D-217). */
export type ReturnFormValues = {
  kind: ReturnRequestInput['kind'];
  reason: ReturnRequestInput['reason'] | '';
  details: string;
};
