import type { CartEntry, LineDelivery } from '../contracts/cart';
import type { EmiPlan } from '../contracts/catalog';
import type {
  CheckoutBlock,
  CheckoutEmiPlan,
  CheckoutPaymentOffer,
  CheckoutQuery,
} from '../contracts/checkout';
import type { Coupon, PaymentMethod, PaymentOffer, PaymentSelection } from '../contracts/offers';
import { allocate, divideHalfUp, formatInr, type Paise } from '../money';
import { istDate } from '../time';
import {
  liveFlashSale,
  paymentReason,
  pricingLines,
  samplePayment,
  type CartPricing,
  type LineFacts,
} from './cart';
import { allowedPaymentMethods, type codEligibility } from './cod';
import { emiMonthly } from './emi';
import { priceOrder, type OrderPricing } from './offers';

const METHODS: PaymentMethod[] = ['upi', 'card', 'emi', 'cod'];

const live = (o: { validFrom: number; validTo: number }, now: number) =>
  now >= o.validFrom && now < o.validTo;

export type CheckoutPayment = Omit<CheckoutQuery, 'addressId'>;

/** The selection as `priceOrder` reads it; nothing is assumed for the customer. */
export function paymentSelection(choice: CheckoutPayment): PaymentSelection | undefined {
  if (!choice.method) return undefined;
  return {
    method: choice.method,
    ...(choice.bank ? { bank: choice.bank } : {}),
    ...(choice.method === 'emi' && choice.tenureMonths
      ? { tenureMonths: choice.tenureMonths }
      : {}),
  };
}

/** Plain words for a payment offer that doesn't fit the payment chosen (D-202). */
function mismatchReason(offer: PaymentOffer): string {
  const banks = offer.banks?.length ? ` with ${offer.banks.join(' or ')}` : '';
  if (offer.kind === 'noCostEmi') return `Pay by EMI over ${offer.tenureMonths} months${banks}.`;
  const how = offer.methods.map((m) => (m === 'upi' ? 'UPI' : m === 'card' ? 'card' : 'EMI'));
  return `Pay by ${how.join(' or ')}${banks} to use this offer.`;
}

/**
 * Checkout for the account cart at one address (D-35, D-55, D-70, D-71, D-198, D-201, D-202).
 * The customer chooses the method, bank, EMI plan and payment offer; none is chosen for them.
 * COD needs `codEligibility`; it never takes a payment offer (D-35). EMI needs one of the plans
 * available at this total. A chosen offer that doesn't fit blocks placing with its reason. The
 * coupon is whatever applies on the cart (D-195).
 */
export function checkout(input: {
  pricing: CartPricing;
  /** Per cart line at the address; null without an address. */
  deliveries: (LineDelivery | null)[] | null;
  cod: ReturnType<typeof codEligibility> | null;
  choice: CheckoutPayment;
  coupons: Coupon[];
  paymentOffers: PaymentOffer[];
  emiPlans: EmiPlan[];
  now: number;
}) {
  const { pricing, choice, now } = input;
  const couponCode = pricing.coupon?.status === 'applied' ? pricing.coupon.code : undefined;
  const base = (paymentOfferId?: string, payment?: PaymentSelection) =>
    priceOrder({
      lines: pricing.pricingLines,
      ...(couponCode ? { couponCode } : {}),
      ...(paymentOfferId ? { paymentOfferId } : {}),
      ...(payment ? { payment } : {}),
      coupons: input.coupons,
      paymentOffers: input.paymentOffers,
      now,
    });
  const beforeOffer = base().totalPaise;

  const allowed = input.cod ? allowedPaymentMethods(input.cod) : METHODS.filter((m) => m !== 'cod');
  const methods = METHODS.map((method) => ({
    method,
    allowed: allowed.includes(method),
    reasons: method === 'cod' && input.cod && !input.cod.allowed ? input.cod.reasons : [],
  }));

  const offers = input.paymentOffers.filter((o) => live(o, now));
  const emiPlans: CheckoutEmiPlan[] = input.emiPlans
    .filter((p) => beforeOffer > 0 && beforeOffer >= p.minAmountPaise)
    .sort((a, b) => a.bank.localeCompare(b.bank) || a.tenureMonths - b.tenureMonths)
    .map((p) => ({
      bank: p.bank,
      tenureMonths: p.tenureMonths,
      annualRateBps: p.annualRateBps,
      monthlyPaise: emiMonthly(beforeOffer, p.tenureMonths, p.annualRateBps),
      noCostOfferId:
        offers.find(
          (o) =>
            o.kind === 'noCostEmi' &&
            o.tenureMonths === p.tenureMonths &&
            (!o.banks || o.banks.includes(p.bank)),
        )?.id ?? null,
    }));
  const banks = [
    ...new Set([...emiPlans.map((p) => p.bank), ...offers.flatMap((o) => o.banks ?? [])]),
  ].sort();

  const payment = paymentSelection(choice);
  const paymentOffers = offers.map((o): CheckoutPaymentOffer => {
    // Saving when paid its way: the customer's payment if it fits, else the first that would.
    const fits = payment && !base(o.id, payment).rejections.length;
    const priced = base(o.id, fits ? payment : samplePayment(o));
    const rejection = priced.rejections.find((r) => r.startsWith('PAYMENT_'));
    return {
      id: o.id,
      kind: o.kind,
      name: o.name,
      validTo: o.validTo,
      methods: o.kind === 'bank' ? o.methods : ['emi'],
      banks: o.banks ?? null,
      tenureMonths: o.kind === 'noCostEmi' ? o.tenureMonths : null,
      savingPaise: priced.paymentOffer?.discountPaise ?? null,
      reason: priced.paymentOffer ? null : paymentReason(rejection!, o),
    };
  });

  const chosenOffer = choice.paymentOfferId
    ? input.paymentOffers.find((o) => o.id === choice.paymentOfferId)
    : undefined;
  const order: OrderPricing = base(choice.paymentOfferId, payment);
  const rejection = order.rejections.find((r) => r.startsWith('PAYMENT_'));
  const paymentOfferReason = !choice.paymentOfferId
    ? null
    : !chosenOffer
      ? 'This offer has ended.'
      : rejection === 'PAYMENT_OFFER_METHOD_MISMATCH'
        ? mismatchReason(chosenOffer)
        : rejection
          ? paymentReason(rejection, chosenOffer)
          : null;

  const plan =
    choice.method === 'emi'
      ? emiPlans.find((p) => p.bank === choice.bank && p.tenureMonths === choice.tenureMonths)
      : undefined;

  const blocks: CheckoutBlock[] = [];
  if (pricing.lines.length === 0) blocks.push('CART_EMPTY');
  else if (!pricing.canCheckout) blocks.push('LINES_NEED_ATTENTION');
  if (!input.deliveries) blocks.push('NO_ADDRESS');
  else if (input.deliveries.some((d) => d?.status !== 'deliverable'))
    blocks.push('NOT_DELIVERABLE');
  if (!choice.method) blocks.push('NO_PAYMENT_METHOD');
  else if (!allowed.includes(choice.method)) blocks.push('PAYMENT_NOT_ALLOWED');
  else if (choice.method === 'emi' && !plan) blocks.push('EMI_PLAN_NEEDED');
  if (paymentOfferReason) blocks.push('PAYMENT_OFFER_NOT_APPLICABLE');

  return {
    methods,
    banks,
    emiPlans,
    paymentOffers,
    order,
    totals: {
      subtotalPaise: order.subtotalPaise,
      couponDiscountPaise: order.coupon?.discountPaise ?? 0,
      paymentDiscountPaise: order.paymentOffer?.discountPaise ?? 0,
      totalPaise: order.totalPaise,
      // No-cost EMI: the customer repays the price before the offer ÷ months (D-45).
      emiMonthlyPaise: !plan
        ? null
        : order.paymentOffer && chosenOffer?.kind === 'noCostEmi'
          ? emiMonthly(beforeOffer, plan.tenureMonths, 0)
          : emiMonthly(order.totalPaise, plan.tenureMonths, plan.annualRateBps),
    },
    paymentOfferReason,
    blocks,
    canPlace: blocks.length === 0,
  };
}

/** One order item: a variant, its selling unit price and everything taken off it (D-203). */
export type OrderLine = {
  /** The cart line it came from. */
  key: string;
  sku: string;
  qty: number;
  unitPricePaise: Paise;
  /** Bundle saving, coupon and payment-offer shares; never more than `unitPricePaise × qty`. */
  discountPaise: Paise;
  flashSaleId: string | null;
  bundleKey: string | null;
};

/**
 * The items an order stores (D-36, D-37, D-46, D-194). Item lines keep their selling price (one
 * flash unit while the sale is live, the rest regular). A bundle becomes one item per member at
 * its regular price, with the bundle saving spread over the members by value; coupon and
 * payment-offer shares come from `priceOrder`, so items always sum to the order total.
 */
export function orderLines(input: {
  entries: (CartEntry & { facts: LineFacts; memberSkus?: string[] })[];
  order: OrderPricing;
  now: number;
}): OrderLine[] {
  const shares = new Map(input.order.lines.map((l) => [l.lineId, l]));
  return input.entries.flatMap((e): OrderLine[] => {
    const lines = pricingLines(e.key, e.qty, e.facts, input.now);
    if (e.facts.kind === 'item') {
      const sale = liveFlashSale(e.facts, input.now);
      const sku = e.key.slice(e.key.indexOf(':') + 1);
      return lines.map((l) => {
        const s = shares.get(l.lineId)!;
        return {
          key: e.key,
          sku,
          qty: l.qty,
          unitPricePaise: l.unitPricePaise,
          discountPaise: s.couponDiscountPaise + s.paymentDiscountPaise,
          flashSaleId: l.priceSource === 'flash' && sale ? sale.id : null,
          bundleKey: null,
        };
      });
    }
    const members = e.facts.members;
    const skus = e.memberSkus ?? [];
    if (skus.length !== members.length) throw new Error(`${e.key}: one SKU per bundle member`);
    const net = shares.get(e.key)!.netPaise;
    const regular = members.map((m) => m.regularPaise * m.qty * e.qty);
    const netShares = allocate(net, regular);
    return members.map((m, i) => ({
      key: e.key,
      sku: skus[i]!,
      qty: m.qty * e.qty,
      unitPricePaise: m.regularPaise,
      discountPaise: regular[i]! - netShares[i]!,
      flashSaleId: null,
      bundleKey: e.key,
    }));
  });
}

/**
 * Once the order is confirmed, what it bought leaves the cart (D-207): item lines lose the units
 * ordered (units added since stay), bundle lines go, and the coupon goes if the order used it.
 */
export function cartAfterOrder(
  cart: { entries: CartEntry[]; couponCode?: string | undefined },
  ordered: { lines: { key: string; qty: number }[]; couponCode: string | null },
): { entries: CartEntry[]; couponCode: string | undefined } {
  const bought = new Map<string, number>();
  for (const l of ordered.lines) bought.set(l.key, (bought.get(l.key) ?? 0) + l.qty);
  const used =
    ordered.couponCode !== null &&
    cart.couponCode?.trim().toUpperCase() === ordered.couponCode.toUpperCase();
  return {
    entries: cart.entries.flatMap((e) => {
      const qty = bought.get(e.key);
      if (qty === undefined) return [e];
      const left = e.key.startsWith('bundle:') ? 0 : e.qty - qty;
      return left > 0 ? [{ ...e, qty: left }] : [];
    }),
    couponCode: used ? undefined : cart.couponCode,
  };
}

/** `BN-` and the order sequence, at least six digits (D-208). */
export const orderNumber = (seq: number) => `BN-${String(seq).padStart(6, '0')}`;

/** Indian financial year (April–March, IST) as "2627" for 2026–27 (D-208). */
export function financialYear(at: number): string {
  const [y, m] = istDate(at).split('-').map(Number) as [number, number];
  const start = m >= 4 ? y : y - 1;
  return `${String(start % 100).padStart(2, '0')}${String((start + 1) % 100).padStart(2, '0')}`;
}

/** GST invoice numbers: unique, at most 16 characters, `INV2627-000001` (D-208). */
export function invoiceNumber(seq: number, at: number): string {
  const n = `INV${financialYear(at)}-${String(seq).padStart(6, '0')}`;
  if (n.length > 16) throw new Error(`invoice number too long: ${n}`);
  return n;
}

export type GstLine = {
  /** GST-inclusive value after every discount. */
  valuePaise: Paise;
  rateBps: number;
};

export type GstSplit = {
  taxablePaise: Paise;
  cgstPaise: Paise;
  sgstPaise: Paise;
  igstPaise: Paise;
};

/**
 * Tax inside a GST-inclusive amount (D-209): taxable = value ÷ (1 + rate), half up; the tax
 * is the rest, so the parts always add back to the value. Within one state it splits into CGST
 * and SGST (any odd paisa to SGST); across states it is IGST.
 */
export function gstSplit(line: GstLine, intraState: boolean): GstSplit {
  const taxablePaise = divideHalfUp(line.valuePaise * 10_000, 10_000 + line.rateBps);
  const tax = line.valuePaise - taxablePaise;
  if (!intraState) return { taxablePaise, cgstPaise: 0, sgstPaise: 0, igstPaise: tax };
  const cgstPaise = Math.floor(tax / 2);
  return { taxablePaise, cgstPaise, sgstPaise: tax - cgstPaise, igstPaise: 0 };
}

/** Same state of supply when the shipping warehouse and the delivery address share a state. */
export const isIntraState = (supplierState: string, deliveryState: string) =>
  supplierState.trim().toLowerCase() === deliveryState.trim().toLowerCase();

/** The rate as printed: "18%". */
export const gstRateLabel = (rateBps: number) =>
  `${rateBps % 100 === 0 ? rateBps / 100 : (rateBps / 100).toFixed(2)}%`;

/** Words on the payment page and in the inbox when payment ends (D-57, D-59). */
export function orderNoticeText(
  notice:
    | 'CANCELLED_BY_CUSTOMER'
    | 'PAYMENT_FAILED'
    | 'HOLD_EXPIRED'
    | 'CONFIRMED_AFTER_EXPIRY'
    | 'REFUNDED_AFTER_EXPIRY',
  totalPaise: Paise,
): string {
  switch (notice) {
    case 'CANCELLED_BY_CUSTOMER':
      return 'You cancelled this order.';
    case 'PAYMENT_FAILED':
      return "The payment didn't go through. Nothing was charged. Your items are still held: try again before the timer ends.";
    case 'HOLD_EXPIRED':
      return "Payment wasn't completed within 5 minutes, so the order was cancelled and the items went back to stock. Nothing was charged.";
    case 'CONFIRMED_AFTER_EXPIRY':
      return 'Your payment arrived after the 5-minute hold ended, but the items were still available, so your order is confirmed.';
    case 'REFUNDED_AFTER_EXPIRY':
      return `Your payment arrived after the 5-minute hold ended and the items had sold out. We refunded the full ${formatInr(totalPaise)} automatically.`;
  }
}
