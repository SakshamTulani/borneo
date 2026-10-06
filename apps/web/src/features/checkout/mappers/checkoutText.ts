import { formatInr, orderNoticeText, type CheckoutBlock, type CodBlock } from '@borneo/shared';
import type { OrderView, PaymentMethod } from '../model';

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: 'UPI',
  card: 'Credit or debit card',
  emi: 'EMI',
  cod: 'Cash on delivery',
};

const COD_REASONS: Record<CodBlock, string> = {
  PREORDER: 'pre-orders are paid online',
  FLASH_SALE: 'flash sale prices are paid online',
  PINCODE: 'not available at this address',
  ORDER_VALUE: 'above the cash on delivery limit',
};

/** Why COD can't be chosen (D-71). */
export const codReasonText = (reasons: CodBlock[]) =>
  reasons.length ? `Not available: ${reasons.map((r) => COD_REASONS[r]).join('; ')}.` : null;

/** What still stands between the customer and placing the order (D-55, D-198, D-202). */
export function blockText(block: CheckoutBlock): string {
  switch (block) {
    case 'CART_EMPTY':
      return 'Your cart is empty.';
    case 'LINES_NEED_ATTENTION':
      return 'Some items in your cart need attention. Fix them in your cart.';
    case 'NO_ADDRESS':
      return 'Add a delivery address.';
    case 'NOT_DELIVERABLE':
      return "Some items can't be delivered to this address. Choose another address or change your cart.";
    case 'NO_PAYMENT_METHOD':
      return 'Choose how to pay.';
    case 'PAYMENT_NOT_ALLOWED':
      return "This payment method isn't available for this order.";
    case 'EMI_PLAN_NEEDED':
      return 'Choose an EMI plan.';
    case 'PAYMENT_OFFER_NOT_APPLICABLE':
      return "The payment offer you chose doesn't apply. Change the payment or remove the offer.";
  }
}

/** "No-cost EMI · 6 months" and the like. */
export const emiPlanText = (p: { bank: string; tenureMonths: number; annualRateBps: number }) =>
  `${p.bank}, ${p.tenureMonths} months · ${p.annualRateBps === 0 ? 'no interest' : `${(p.annualRateBps / 100).toFixed(2).replace(/\.00$/, '')}% a year`}`;

/** The order's notice in plain words (D-57, D-59). */
export const noticeText = (order: OrderView) =>
  order.notice ? orderNoticeText(order.notice, order.totalPaise) : null;

export const paidWith = (order: OrderView) =>
  [
    METHOD_LABELS[order.payment.method],
    order.payment.bank,
    order.payment.tenureMonths ? `${order.payment.tenureMonths} months` : null,
  ]
    .filter(Boolean)
    .join(' · ');

export const offerSavingText = (o: { kind: 'bank' | 'noCostEmi'; savingPaise: number | null }) =>
  o.savingPaise === null
    ? null
    : o.kind === 'noCostEmi'
      ? `No interest to pay: ${formatInr(o.savingPaise)} off upfront`
      : `Saves ${formatInr(o.savingPaise)}`;
