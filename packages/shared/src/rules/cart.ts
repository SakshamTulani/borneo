import {
  MAX_CART_LINES,
  MAX_LINE_QTY,
  lineKeySchema,
  type CartCoupon,
  type CartEntry,
  type CartLine,
  type CartLineStatus,
  type CouponPreview,
  type LineDelivery,
  type PaymentOfferPreview,
} from '../contracts/cart';
import type { EmiPlan, ProductStatus } from '../contracts/catalog';
import type { Coupon, FlashSale, PaymentOffer, PaymentSelection } from '../contracts/offers';
import { formatInr, sumPaise, type Paise } from '../money';
import { emiFrom } from './emi';
import { flashState } from './flash';
import { priceOrder, type OfferRejection } from './offers';

export const itemKey = (sku: string) => `item:${sku}`;
export const bundleKey = (slug: string) => `bundle:${slug}`;

export type LineRef = { kind: 'item'; sku: string } | { kind: 'bundle'; slug: string };

export function parseLineKey(key: string): LineRef | undefined {
  if (!lineKeySchema.safeParse(key).success) return undefined;
  const [kind, value] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  return kind === 'item' ? { kind, sku: value } : { kind: 'bundle', slug: value };
}

const clampQty = (qty: number) => Math.min(MAX_LINE_QTY, Math.max(1, Math.floor(qty)));

/**
 * A clean cart (D-193): one line per key (quantities add), each at most 5 units, at most 20 lines
 * (the earliest kept). Lines that aren't cart lines are dropped.
 */
export function normalizeEntries(lines: { key: string; qty: number }[]): CartEntry[] {
  const out: CartEntry[] = [];
  for (const line of lines) {
    if (!parseLineKey(line.key) || !(line.qty >= 1)) continue;
    const existing = out.find((e) => e.key === line.key);
    if (existing) existing.qty = clampQty(existing.qty + line.qty);
    else if (out.length < MAX_CART_LINES) out.push({ key: line.key, qty: clampQty(line.qty) });
  }
  return out;
}

/** Adds units to a line (capped at 5) or a new line; a 21st line is refused (D-193). */
export function addEntry(
  entries: CartEntry[],
  add: CartEntry,
): { ok: true; entries: CartEntry[] } | { ok: false; reason: 'CART_FULL' } {
  if (!entries.some((e) => e.key === add.key) && entries.length >= MAX_CART_LINES)
    return { ok: false, reason: 'CART_FULL' };
  return { ok: true, entries: normalizeEntries([...entries, add]) };
}

/**
 * Signing in merges this browser's cart into the account cart (D-192): quantities add (capped),
 * account lines first. A coupon entered in the browser replaces the account's.
 */
export function mergeCarts(
  account: { entries: CartEntry[]; couponCode?: string | undefined },
  browser: { entries: { key: string; qty: number }[]; couponCode?: string | undefined },
): { entries: CartEntry[]; couponCode: string | undefined } {
  return {
    entries: normalizeEntries([...account.entries, ...browser.entries]),
    couponCode: browser.couponCode ?? account.couponCode,
  };
}

/** What the rules need to know about a variant in the cart. */
export type ItemFacts = {
  kind: 'item';
  productId: string;
  categoryId: string;
  status: ProductStatus;
  regularPaise: Paise;
  unitsAvailable: number;
  preorderCap: number | null;
  preorderSold: number;
  /** Sales that have not ended; the rule decides which is live (D-140). */
  flashSales: FlashSale[];
};

/** What the rules need to know about a fixed bundle (fixed, D-197). */
export type BundleFacts = {
  kind: 'bundle';
  pricePaise: Paise;
  activeFrom: number;
  activeTo: number | null;
  members: {
    productId: string;
    categoryId: string;
    status: ProductStatus;
    regularPaise: Paise;
    unitsAvailable: number;
    qty: number;
  }[];
};

export type LineFacts = ItemFacts | BundleFacts;

const bundleActive = (b: BundleFacts, now: number) =>
  now >= b.activeFrom && (b.activeTo === null || now < b.activeTo);

/** Can this line be sold at all, whatever the stock (D-197)? */
function sellable(facts: LineFacts, now: number): boolean {
  if (facts.kind === 'item') return facts.status === 'live' || facts.status === 'preorder';
  return bundleActive(facts, now) && facts.members.every((m) => m.status === 'live');
}

/**
 * Units we can supply now: pre-orders against what is left of the cap (D-65), live variants
 * against unreserved stock, bundles by their scarcest member (D-197). Nothing is held.
 */
export function lineSupply(facts: LineFacts, now: number): number {
  if (!sellable(facts, now)) return 0;
  if (facts.kind === 'bundle')
    return Math.max(0, Math.min(...facts.members.map((m) => Math.floor(m.unitsAvailable / m.qty))));
  if (facts.status === 'preorder')
    return facts.preorderCap === null ? 0 : Math.max(0, facts.preorderCap - facts.preorderSold);
  return Math.max(0, facts.unitsAvailable);
}

/**
 * Whether a line can be bought as it stands (D-198). It never says how many are left (D-148):
 * "not enough stock" asks for a lower quantity, and the stepper stops at what we can supply.
 */
export function lineStatus(facts: LineFacts, qty: number, now: number): CartLineStatus {
  if (!sellable(facts, now)) return 'unavailable';
  const supply = lineSupply(facts, now);
  if (supply === 0) return 'outOfStock';
  return qty > supply ? 'notEnoughStock' : 'ok';
}

/** The stepper's maximum: 5, or what we can supply if less (D-193). */
export function lineMaxQty(facts: LineFacts, now: number): number {
  return Math.min(MAX_LINE_QTY, Math.max(1, lineSupply(facts, now)));
}

/** The flash sale live on this variant right now, if any (D-140). */
export function liveFlashSale(facts: ItemFacts, now: number): FlashSale | undefined {
  return facts.flashSales.find((s) => flashState(s, now) === 'live');
}

/**
 * The lines `priceOrder` sees for one cart line (D-194). While a flash sale is live, one unit
 * (the per-customer limit, D-142) is at the flash price and the rest at the regular price.
 * The flash price is never stored: once the sale ends every unit is regular again (D-140).
 * A bundle is one line at the bundle price, never a flash price (D-39).
 */
export function pricingLines(key: string, qty: number, facts: LineFacts, now: number): CartLine[] {
  if (facts.kind === 'bundle') {
    return [
      {
        lineId: key,
        kind: 'bundle',
        categoryIds: [...new Set(facts.members.map((m) => m.categoryId))],
        qty,
        unitPricePaise: facts.pricePaise,
        priceSource: 'bundle',
        isPreorder: false,
      },
    ];
  }
  const base = {
    kind: 'item' as const,
    categoryIds: [facts.categoryId],
    isPreorder: facts.status === 'preorder',
  };
  const sale = liveFlashSale(facts, now);
  const flashUnits = sale ? Math.min(qty, sale.perCustomerLimit) : 0;
  const lines: CartLine[] = [];
  if (sale && flashUnits > 0)
    lines.push({
      ...base,
      lineId: `${key}#flash`,
      qty: flashUnits,
      unitPricePaise: sale.salePricePaise,
      priceSource: 'flash',
    });
  if (qty > flashUnits)
    lines.push({
      ...base,
      lineId: key,
      qty: qty - flashUnits,
      unitPricePaise: facts.regularPaise,
      priceSource: 'regular',
    });
  return lines;
}

/** Bundle lines combine their members' estimates: the latest dates, any gap blocks it (D-55). */
export function combineDeliveries(parts: LineDelivery[]): LineDelivery {
  if (parts.some((p) => p.status === 'notDeliverable')) return { status: 'notDeliverable' };
  const dates = parts.flatMap((p) => (p.status === 'deliverable' ? [p] : []));
  if (dates.length === 0 || dates.length < parts.length) return { status: 'outOfStockHere' };
  return {
    status: 'deliverable',
    from: dates
      .map((d) => d.from)
      .sort()
      .at(-1)!,
    to: dates
      .map((d) => d.to)
      .sort()
      .at(-1)!,
  };
}

const live = (o: { validFrom: number; validTo: number }, now: number) =>
  now >= o.validFrom && now < o.validTo;
const inScope = (scope: string[] | undefined, line: CartLine) =>
  !scope || line.categoryIds.some((c) => scope.includes(c));

/** The coupon-eligible subtotal: regular-price lines in scope (D-36). */
function couponBase(coupon: Coupon, lines: CartLine[]): Paise {
  return sumPaise(
    lines
      .filter((l) => l.priceSource === 'regular' && inScope(coupon.categoryIds, l))
      .map((l) => l.unitPricePaise * l.qty),
  );
}

/** Plain words for a coupon that doesn't apply (D-195). */
export function couponReason(
  rejection: OfferRejection,
  coupon: Coupon | undefined,
  lines: CartLine[],
): string {
  if (!coupon || rejection === 'COUPON_NOT_FOUND') return "This code isn't valid or has ended.";
  if (rejection === 'COUPON_NOT_ACTIVE') return "This coupon isn't active right now.";
  if (rejection === 'COUPON_MIN_ORDER' && coupon.minOrderPaise !== undefined) {
    const short = coupon.minOrderPaise - couponBase(coupon, lines);
    return `Add ${formatInr(short)} more of eligible items to use this coupon.`;
  }
  return coupon.categoryIds
    ? "Nothing in your cart qualifies. It's for selected categories, and not for flash sale or bundle prices."
    : "Nothing in your cart qualifies. Coupons don't apply to flash sale or bundle prices.";
}

function paymentReason(rejection: OfferRejection, offer: PaymentOffer): string {
  if (rejection === 'PAYMENT_OFFER_MIN_ORDER' && offer.minOrderPaise !== undefined)
    return `On orders of ${formatInr(offer.minOrderPaise)} or more.`;
  if (rejection === 'PAYMENT_OFFER_NOT_ACTIVE') return "This offer isn't active right now.";
  return 'Not on the items in your cart.';
}

/** The payment that would use this offer, to preview its saving (D-196). */
function samplePayment(offer: PaymentOffer): PaymentSelection {
  const bank = offer.banks?.[0];
  return offer.kind === 'bank'
    ? { method: offer.methods[0]!, ...(bank ? { bank } : {}) }
    : { method: 'emi', tenureMonths: offer.tenureMonths, ...(bank ? { bank } : {}) };
}

/**
 * "from ₹X/mo" on a cart total (D-33, D-47): a no-cost plan counts as interest-free only while
 * its offer is live, above its minimum and covers every line (otherwise part would bear interest).
 */
export function cartEmiFrom(input: {
  totalPaise: Paise;
  lines: CartLine[];
  paymentOffers: PaymentOffer[];
  emiPlans: EmiPlan[];
  now: number;
}): Paise | undefined {
  if (input.totalPaise === 0) return undefined;
  const noCost = new Set(
    input.paymentOffers.flatMap((o) =>
      o.kind === 'noCostEmi' &&
      live(o, input.now) &&
      (o.minOrderPaise === undefined || input.totalPaise >= o.minOrderPaise) &&
      input.lines.every((l) => inScope(o.categoryIds, l))
        ? input.emiPlans
            .filter(
              (p) => p.tenureMonths === o.tenureMonths && (!o.banks || o.banks.includes(p.bank)),
            )
            .map((p) => p.id)
        : [],
    ),
  );
  return emiFrom(input.totalPaise, input.emiPlans, noCost);
}

export type PricedCartLine = {
  key: string;
  status: CartLineStatus;
  maxQty: number;
  isPreorder: boolean;
  /** Regular unit price (bundle price for bundles). */
  unitPricePaise: Paise;
  flash: { unitPricePaise: Paise; endsAt: number } | null;
  linePaise: Paise;
  couponDiscountPaise: Paise;
};

export type CartPricing = {
  lines: PricedCartLine[];
  /** What `priceOrder` priced: lines that can be bought (D-198). */
  pricingLines: CartLine[];
  subtotalPaise: Paise;
  coupon: CartCoupon | null;
  totalPaise: Paise;
  emiFromPaise: Paise | undefined;
  coupons: CouponPreview[];
  paymentOffers: PaymentOfferPreview[];
  canCheckout: boolean;
};

/**
 * Prices a cart (D-30s, D-193–D-198). Lines that can't be bought stay listed but out of the
 * totals; checkout waits until every line is fine. The customer's coupon applies when it
 * qualifies and is kept, with the reason, when it doesn't. Other live coupons and every live
 * payment offer are previewed with what they'd save; none is applied for the customer (D-195, D-196).
 */
export function priceCart(input: {
  entries: { key: string; qty: number; facts: LineFacts }[];
  couponCode?: string | undefined;
  coupons: Coupon[];
  paymentOffers: PaymentOffer[];
  emiPlans: EmiPlan[];
  now: number;
}): CartPricing {
  const { now } = input;
  const perEntry = input.entries.map((e) => {
    const status = lineStatus(e.facts, e.qty, now);
    const payable = status === 'ok' || status === 'notEnoughStock';
    return { ...e, status, lines: payable ? pricingLines(e.key, e.qty, e.facts, now) : [] };
  });
  const lines = perEntry.flatMap((e) => e.lines);
  const order = priceOrder({
    lines,
    ...(input.couponCode !== undefined ? { couponCode: input.couponCode } : {}),
    coupons: input.coupons,
    paymentOffers: [],
    now,
  });
  const byLine = new Map(order.lines.map((l) => [l.lineId, l]));

  const findCoupon = (code: string) =>
    input.coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  let coupon: CartCoupon | null = null;
  if (input.couponCode !== undefined) {
    const found = findCoupon(input.couponCode);
    coupon =
      order.coupon && found
        ? {
            status: 'applied',
            code: found.code,
            name: found.name,
            discountPaise: order.coupon.discountPaise,
          }
        : {
            status: 'notApplied',
            code: found?.code ?? input.couponCode.trim().toUpperCase(),
            reason: couponReason(order.rejections[0] ?? 'COUPON_NOT_FOUND', found, lines),
          };
  }
  const applied = coupon?.status === 'applied' ? coupon.code : undefined;

  const coupons = input.coupons
    .filter((c) => live(c, now) && c.code !== applied)
    .map((c): CouponPreview => {
      const priced = priceOrder({
        lines,
        couponCode: c.code,
        coupons: [c],
        paymentOffers: [],
        now,
      });
      return {
        code: c.code,
        name: c.name,
        validTo: c.validTo,
        savingPaise: priced.coupon?.discountPaise ?? null,
        reason: priced.coupon ? null : couponReason(priced.rejections[0]!, c, lines),
      };
    });

  const paymentOffers = input.paymentOffers
    .filter((o) => live(o, now))
    .map((o): PaymentOfferPreview => {
      const priced = priceOrder({
        lines,
        ...(applied ? { couponCode: applied } : {}),
        paymentOfferId: o.id,
        payment: samplePayment(o),
        coupons: input.coupons,
        paymentOffers: [o],
        now,
      });
      const rejection = priced.rejections.find((r) => r.startsWith('PAYMENT_'));
      return {
        id: o.id,
        kind: o.kind,
        name: o.name,
        validTo: o.validTo,
        savingPaise: priced.paymentOffer?.discountPaise ?? null,
        reason: priced.paymentOffer ? null : paymentReason(rejection!, o),
      };
    });

  return {
    lines: perEntry.map((e) => {
      const priced = e.lines.map((l) => byLine.get(l.lineId)!);
      const flashLine = e.lines.find((l) => l.priceSource === 'flash');
      const sale = e.facts.kind === 'item' ? liveFlashSale(e.facts, now) : undefined;
      return {
        key: e.key,
        status: e.status,
        maxQty: lineMaxQty(e.facts, now),
        isPreorder: e.facts.kind === 'item' && e.facts.status === 'preorder',
        unitPricePaise: e.facts.kind === 'item' ? e.facts.regularPaise : e.facts.pricePaise,
        flash:
          flashLine && sale
            ? { unitPricePaise: flashLine.unitPricePaise, endsAt: sale.endsAt }
            : null,
        linePaise: sumPaise(priced.map((p) => p.linePaise)),
        couponDiscountPaise: sumPaise(priced.map((p) => p.couponDiscountPaise)),
      };
    }),
    pricingLines: lines,
    subtotalPaise: order.subtotalPaise,
    coupon,
    totalPaise: order.totalPaise,
    emiFromPaise: cartEmiFrom({
      totalPaise: order.totalPaise,
      lines,
      paymentOffers: input.paymentOffers,
      emiPlans: input.emiPlans,
      now,
    }),
    coupons,
    paymentOffers,
    canCheckout: perEntry.length > 0 && perEntry.every((e) => e.status === 'ok'),
  };
}

/**
 * Checkout waits until every line can be bought as it stands (D-198) and, once a pincode is
 * known, every line can be delivered there (D-55).
 */
export function cartReady(linesReady: boolean, deliveries: (LineDelivery | null)[]): boolean {
  return linesReady && deliveries.every((d) => d === null || d.status === 'deliverable');
}

/**
 * A bundle on a member's product page (D-197): only while it can be bought, and only with a real
 * saving against the members' regular prices (D-197).
 */
export function bundleOffer(
  facts: BundleFacts,
  now: number,
): { pricePaise: Paise; separatePaise: Paise; savingPaise: Paise } | undefined {
  if (lineSupply(facts, now) < 1) return undefined;
  const separatePaise = sumPaise(facts.members.map((m) => m.regularPaise * m.qty));
  const savingPaise = separatePaise - facts.pricePaise;
  return savingPaise > 0 ? { pricePaise: facts.pricePaise, separatePaise, savingPaise } : undefined;
}
