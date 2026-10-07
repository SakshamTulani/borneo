import type { OrderStatus } from '../contracts/orders';
import type { ReturnPolicy } from '../contracts/catalog';
import { formatInr, type Paise } from '../money';
import { canCustomerCancel } from './orders';
import { canRequestReturn, type ReturnReason } from './returns';

// After the order (Phase L): tracking, cancelling, returns, owned devices and review prompts.

/** Delivery steps a confirmed order moves through (D-215). */
export const TRACKING_STEPS = [
  'placed',
  'confirmed',
  'packed',
  'shipped',
  'outForDelivery',
  'delivered',
] as const;
export type TrackingStep = (typeof TRACKING_STEPS)[number];

export const TRACKING_LABELS: Record<TrackingStep, string> = {
  placed: 'Order placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  outForDelivery: 'Out for delivery',
  delivered: 'Delivered',
};

/** One recorded step with its time (epoch ms). */
export type TrackingEvent = { step: TrackingStep; at: number };

/**
 * The tracking timeline (D-215): every step with its time once reached, in order. The step after
 * the last one reached is "current" while the order is moving; nothing is current once it has
 * been delivered, cancelled or refunded.
 */
export function trackingTimeline(
  status: OrderStatus,
  events: TrackingEvent[],
): { step: TrackingStep; at: number | null; state: 'done' | 'current' | 'upcoming' }[] {
  const reached = new Map<TrackingStep, number>();
  for (const e of events) if (!reached.has(e.step)) reached.set(e.step, e.at);
  const lastIndex = Math.max(-1, ...TRACKING_STEPS.map((s, i) => (reached.has(s) ? i : -1)));
  const moving = status !== 'cancelled' && status !== 'refunded' && status !== 'delivered';
  return TRACKING_STEPS.map((step, i) => ({
    step,
    at: reached.get(step) ?? null,
    state: i <= lastIndex ? 'done' : moving && i === lastIndex + 1 ? 'current' : 'upcoming',
  }));
}

/**
 * Demo courier (D-215): the step "Advance" moves a confirmed order to. Out for delivery is a
 * tracking step only; the order stays `shipped` until delivered. Null when nothing comes next.
 */
export function nextDemoStep(
  status: OrderStatus,
  events: TrackingEvent[],
): Exclude<TrackingStep, 'placed' | 'confirmed'> | null {
  switch (status) {
    case 'confirmed':
      return 'packed';
    case 'packed':
      return 'shipped';
    case 'shipped':
      return events.some((e) => e.step === 'outForDelivery') ? 'delivered' : 'outForDelivery';
    default:
      return null;
  }
}

/** The order status after a tracking step (D-215). */
export function statusAfterStep(step: TrackingStep, current: OrderStatus): OrderStatus {
  switch (step) {
    case 'packed':
      return 'packed';
    case 'shipped':
    case 'outForDelivery':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    default:
      return current;
  }
}

/**
 * Cancelling in the account (D-149, D-216): until the order ships. A paid order (prepaid and
 * confirmed or packed) is refunded in full; an unpaid one (payment pending, or cash on delivery)
 * has nothing to refund.
 */
export function cancelOutcome(input: {
  status: OrderStatus;
  prepaid: boolean;
  totalPaise: Paise;
}): { ok: false } | { ok: true; refundPaise: Paise } {
  if (!canCustomerCancel(input.status)) return { ok: false };
  const paid = input.prepaid && input.status !== 'pending_payment';
  return { ok: true, refundPaise: paid ? input.totalPaise : 0 };
}

/** What the customer is told after cancelling (D-216). */
export function cancelText(refundPaise: Paise, prepaid: boolean): string {
  if (refundPaise > 0)
    return `Your order is cancelled. We're refunding ${formatInr(refundPaise)} to your original payment method.`;
  return prepaid
    ? 'Your order is cancelled. Nothing was charged.'
    : 'Your order is cancelled. Nothing is due, as it was cash on delivery.';
}

/** What the customer paid for an order line after every discount (D-219). */
export function linePaidPaise(item: {
  unitPricePaise: Paise;
  qty: number;
  discountPaise: Paise;
}): Paise {
  return Math.max(0, item.unitPricePaise * item.qty - item.discountPaise);
}

export const RETURN_REASONS: Record<ReturnReason, string> = {
  defect: 'It has a defect',
  damage: 'It arrived damaged',
  changedMind: 'I changed my mind',
  other: 'Something else',
};

/**
 * What a customer may ask for on a delivered order line (D-86, D-217): each kind with the
 * reasons it accepts under the category's policy (D-81, D-89), while the window is open (D-87)
 * and no request is already open for that line. Empty when nothing can be asked.
 */
export function returnOptions(input: {
  policy: ReturnPolicy;
  deliveredAt: number | undefined;
  now: number;
  hasOpenRequest: boolean;
}): { kind: 'return' | 'replacement'; reasons: ReturnReason[] }[] {
  if (input.hasOpenRequest) return [];
  const reasons = Object.keys(RETURN_REASONS) as ReturnReason[];
  return (['return', 'replacement'] as const).flatMap((kind) => {
    const ok = reasons.filter(
      (reason) =>
        canRequestReturn({
          policy: input.policy,
          now: input.now,
          kind,
          reason,
          ...(input.deliveredAt === undefined ? {} : { deliveredAt: input.deliveredAt }),
        }).ok,
    );
    return ok.length ? [{ kind, reasons: ok }] : [];
  });
}

/** Defect or damage needs photos; change of mind doesn't (D-88). */
export const photosRequired = (reason: ReturnReason) => reason === 'defect' || reason === 'damage';

/** Return photos (D-217): 1–3 for defect or damage, JPEG, PNG or WebP, up to 2 MB each. */
export const RETURN_PHOTO_MAX = 3;
export const RETURN_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export type PhotoType = 'image/jpeg' | 'image/png' | 'image/webp';

/** The image type from the file's first bytes, never from its name or a declared type (D-217). */
export function photoType(bytes: Uint8Array): PhotoType | null {
  const at = (i: number) => bytes[i];
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg';
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b))
    return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Why a set of return photos can't be accepted, or null when it can (D-88, D-217). */
export function photoProblem(
  photos: Uint8Array[],
  required: boolean,
): 'PHOTOS_REQUIRED' | 'TOO_MANY_PHOTOS' | 'PHOTO_TOO_LARGE' | 'PHOTO_NOT_IMAGE' | null {
  if (required && photos.length === 0) return 'PHOTOS_REQUIRED';
  if (photos.length > RETURN_PHOTO_MAX) return 'TOO_MANY_PHOTOS';
  if (photos.some((p) => p.length > RETURN_PHOTO_MAX_BYTES)) return 'PHOTO_TOO_LARGE';
  if (photos.some((p) => photoType(p) === null)) return 'PHOTO_NOT_IMAGE';
  return null;
}

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'completed';

/** Demo support desk (D-219): requested → approved → completed. Null when it has ended. */
export function nextDemoReturnStatus(status: ReturnStatus): ReturnStatus | null {
  if (status === 'requested') return 'approved';
  if (status === 'approved') return 'completed';
  return null;
}

/**
 * Refund when a request completes (D-219): a return gives back what the line cost after
 * discounts, on a prepaid order. Cash-on-delivery refunds wait for an owner decision; replacements refund nothing.
 */
export function returnRefundPaise(input: {
  kind: 'return' | 'replacement';
  prepaid: boolean;
  linePaidPaise: Paise;
}): Paise {
  return input.kind === 'return' && input.prepaid ? input.linePaidPaise : 0;
}

/** A delivered order line, as owned devices and review prompts see it (D-24). */
export type DeliveredLine = {
  orderItemId: string;
  productId: string;
  deliveredAt: number;
  /** A completed return (not a replacement): the customer no longer owns it. */
  returned: boolean;
};

/**
 * Owned devices (D-24, D-220): products from delivered order lines, minus lines returned for a
 * refund; one entry per product (the latest delivery), newest first. Never self-declared.
 */
export function ownedProducts<T extends DeliveredLine>(lines: T[]): T[] {
  const latest = new Map<string, T>();
  for (const l of lines) {
    if (l.returned) continue;
    const seen = latest.get(l.productId);
    if (!seen || l.deliveredAt > seen.deliveredAt) latest.set(l.productId, l);
  }
  return [...latest.values()].sort((a, b) => b.deliveredAt - a.deliveredAt);
}

/**
 * Review prompts (D-151, D-221): one per product the customer has received and not reviewed
 * (one review per product per customer), on the latest delivered line, newest first. Returned
 * items still count: a customer who sent something back may say why.
 */
export function reviewPrompts<T extends DeliveredLine>(
  lines: T[],
  reviewedProductIds: Set<string>,
): T[] {
  const latest = new Map<string, T>();
  for (const l of lines) {
    if (reviewedProductIds.has(l.productId)) continue;
    const seen = latest.get(l.productId);
    if (!seen || l.deliveredAt > seen.deliveredAt) latest.set(l.productId, l);
  }
  return [...latest.values()].sort((a, b) => b.deliveredAt - a.deliveredAt);
}

/** Most variants one customer can watch (D-222). */
export const WATCH_MAX = 50;
