import type { CartLine } from '../contracts/cart';
import type { Coupon, Discount, PaymentOffer, PaymentSelection } from '../contracts/offers';
import { allocate, percentOf, sumPaise, type Paise } from '../money';
import { emiInterest } from './emi';

export function discountAmount(discount: Discount, basePaise: Paise): Paise {
  const raw = discount.kind === 'flat' ? discount.amountPaise : percentOf(basePaise, discount.bps);
  const capped =
    discount.kind === 'percent' && discount.maxPaise !== undefined
      ? Math.min(raw, discount.maxPaise)
      : raw;
  return Math.min(capped, basePaise);
}

/** Bank: its discount. No-cost EMI: the interest the plan would charge (D-45). */
export function paymentOfferDiscount(offer: PaymentOffer, basePaise: Paise): Paise {
  return offer.kind === 'bank'
    ? discountAmount(offer.discount, basePaise)
    : Math.min(basePaise, emiInterest(basePaise, offer.tenureMonths, offer.annualRateBps));
}

export type OfferRejection =
  | 'COUPON_NOT_FOUND'
  | 'COUPON_NOT_ACTIVE'
  | 'COUPON_NO_ELIGIBLE_ITEMS'
  | 'COUPON_MIN_ORDER'
  | 'PAYMENT_OFFER_NOT_FOUND'
  | 'PAYMENT_OFFER_NOT_ACTIVE'
  | 'PAYMENT_OFFER_METHOD_MISMATCH'
  | 'PAYMENT_OFFER_MIN_ORDER'
  | 'PAYMENT_OFFER_NO_ELIGIBLE_ITEMS';

export type PricedLine = {
  lineId: string;
  linePaise: Paise;
  couponDiscountPaise: Paise;
  paymentDiscountPaise: Paise;
  netPaise: Paise;
};

export type OrderPricing = {
  subtotalPaise: Paise;
  coupon?: { id: string; discountPaise: Paise };
  paymentOffer?: { id: string; discountPaise: Paise };
  totalPaise: Paise;
  lines: PricedLine[];
  rejections: OfferRejection[];
};

const active = (o: { validFrom: number; validTo: number }, now: number) =>
  now >= o.validFrom && now < o.validTo;
const inScope = (scope: string[] | undefined, line: CartLine) =>
  !scope || line.categoryIds.some((c) => scope.includes(c));

/**
 * Prices an order with at most one coupon and one payment offer (D-35). The input
 * shape allows only one of each. Coupons only touch regular-price lines: never flash (D-36)
 * or bundle (D-37) prices. Coupon minimums use the coupon-eligible subtotal (D-43).
 * Payment offers apply after the coupon, to every in-scope line incl. flash and bundle (D-44).
 * Discounts are spread across lines; shares sum exactly (D-46).
 */
export function priceOrder(input: {
  lines: CartLine[];
  couponCode?: string;
  paymentOfferId?: string;
  payment?: PaymentSelection;
  coupons: Coupon[];
  paymentOffers: PaymentOffer[];
  now: number;
}): OrderPricing {
  const { lines, now } = input;
  const linePaise = lines.map((l) => l.unitPricePaise * l.qty);
  const subtotalPaise = sumPaise(linePaise);
  const rejections: OfferRejection[] = [];
  const couponShares = lines.map(() => 0);
  const paymentShares = lines.map(() => 0);
  let coupon: OrderPricing['coupon'];
  let paymentOffer: OrderPricing['paymentOffer'];

  if (input.couponCode !== undefined) {
    const found = input.coupons.find(
      (c) => c.code.toUpperCase() === input.couponCode!.trim().toUpperCase(),
    );
    const eligible = lines.map((l) =>
      found && l.priceSource === 'regular' && inScope(found.categoryIds, l) ? 1 : 0,
    );
    const eligibleWeights = linePaise.map((p, i) => p * eligible[i]!);
    const eligibleSubtotal = sumPaise(eligibleWeights);
    if (!found) rejections.push('COUPON_NOT_FOUND');
    else if (!active(found, now)) rejections.push('COUPON_NOT_ACTIVE');
    else if (eligibleSubtotal === 0) rejections.push('COUPON_NO_ELIGIBLE_ITEMS');
    else if (found.minOrderPaise !== undefined && eligibleSubtotal < found.minOrderPaise)
      rejections.push('COUPON_MIN_ORDER');
    else {
      const discountPaise = discountAmount(found.discount, eligibleSubtotal);
      allocate(discountPaise, eligibleWeights).forEach((s, i) => (couponShares[i] = s));
      coupon = { id: found.id, discountPaise };
    }
  }

  if (input.paymentOfferId !== undefined) {
    const offer = input.paymentOffers.find((o) => o.id === input.paymentOfferId);
    const afterCoupon = linePaise.map((p, i) => p - couponShares[i]!);
    const weights = afterCoupon.map((p, i) =>
      offer && inScope(offer.categoryIds, lines[i]!) ? p : 0,
    );
    const base = sumPaise(weights);
    if (!offer) rejections.push('PAYMENT_OFFER_NOT_FOUND');
    else if (!active(offer, now)) rejections.push('PAYMENT_OFFER_NOT_ACTIVE');
    else if (!paymentMatches(offer, input.payment))
      rejections.push('PAYMENT_OFFER_METHOD_MISMATCH');
    else if (base === 0) rejections.push('PAYMENT_OFFER_NO_ELIGIBLE_ITEMS');
    else if (offer.minOrderPaise !== undefined && base < offer.minOrderPaise)
      rejections.push('PAYMENT_OFFER_MIN_ORDER');
    else {
      const discountPaise = paymentOfferDiscount(offer, base);
      allocate(discountPaise, weights).forEach((s, i) => (paymentShares[i] = s));
      paymentOffer = { id: offer.id, discountPaise };
    }
  }

  const priced = lines.map((l, i) => ({
    lineId: l.lineId,
    linePaise: linePaise[i]!,
    couponDiscountPaise: couponShares[i]!,
    paymentDiscountPaise: paymentShares[i]!,
    netPaise: linePaise[i]! - couponShares[i]! - paymentShares[i]!,
  }));
  return {
    subtotalPaise,
    ...(coupon ? { coupon } : {}),
    ...(paymentOffer ? { paymentOffer } : {}),
    totalPaise: sumPaise(priced.map((l) => l.netPaise)),
    lines: priced,
    rejections,
  };
}

/** No-cost EMI needs EMI at its tenure; COD never gets a payment offer (D-35). */
function paymentMatches(offer: PaymentOffer, payment: PaymentSelection | undefined): boolean {
  if (!payment || payment.method === 'cod') return false;
  if (offer.banks && (!payment.bank || !offer.banks.includes(payment.bank))) return false;
  if (offer.kind === 'noCostEmi')
    return payment.method === 'emi' && payment.tenureMonths === offer.tenureMonths;
  return (offer.methods as string[]).includes(payment.method);
}
