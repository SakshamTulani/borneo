import { RETURN_REASONS, TRACKING_LABELS, type OrderStatus } from '@borneo/shared';
import type { ReturnRequestView, TrackingView } from '../model';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export type StatusTone = 'success' | 'brand' | 'neutral' | 'danger' | 'warning';

export function statusTone(status: OrderStatus): StatusTone {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled' || status === 'refunded') return 'danger';
  if (status === 'pending_payment') return 'warning';
  return 'brand';
}

export const stepLabel = (step: TrackingView['steps'][number]['step']) => TRACKING_LABELS[step];

export const reasonLabel = (reason: ReturnRequestView['reason']) => RETURN_REASONS[reason];

export const RETURN_STATUS_LABELS: Record<ReturnRequestView['status'], string> = {
  requested: 'Requested',
  approved: 'Approved: pick-up booked',
  rejected: 'Not approved',
  completed: 'Completed',
};

export const kindLabel = (kind: ReturnRequestView['kind']) =>
  kind === 'return' ? 'Return' : 'Replacement';

/** "Pulse 4, Nova 3 and 2 more" for list rows. */
export function itemsLine(names: string[], count: number): string {
  const shown = names.slice(0, 2).join(', ');
  const more = count - Math.min(2, names.length);
  return more > 0 ? `${shown} and ${more} more` : shown;
}
