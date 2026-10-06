import type { EmiPlan } from '../contracts/catalog';
import type { FlashSale, PaymentOffer } from '../contracts/offers';
import type { Paise } from '../money';
import { emiFrom } from './emi';
import { unitPriceWithFlash } from './flash';
import { paymentOfferDiscount } from './offers';

/**
 * Savings vs a genuine MRP (D-31). Percent is floored so it never overstates;
 * shown only when it is at least 1% (D-42).
 */
export function savings(
  mrpPaise: Paise | undefined,
  sellingPaise: Paise,
): { paise: Paise; percent: number } | undefined {
  if (mrpPaise === undefined || mrpPaise <= sellingPaise) return undefined;
  const paise = mrpPaise - sellingPaise;
  const percent = Math.floor((paise * 100) / mrpPaise);
  return percent >= 1 ? { paise, percent } : undefined;
}

/**
 * Best "effective price with [offer]" (D-32): only bank offers that apply to everyone paying
 * that way, live now, in scope for the category and met by this price alone. Never the headline
 * (D-30). No-cost EMI is never an effective price: the customer still repays the full price (D-45).
 */
export function effectivePrice(
  sellingPaise: Paise,
  categoryId: string,
  offers: PaymentOffer[],
  now: number,
): { paise: Paise; offerName: string } | undefined {
  let best: { paise: Paise; offerName: string } | undefined;
  for (const offer of offers) {
    if (
      offer.kind !== 'bank' ||
      !offer.appliesToAll ||
      now < offer.validFrom ||
      now >= offer.validTo
    )
      continue;
    if (offer.categoryIds && !offer.categoryIds.includes(categoryId)) continue;
    if (offer.minOrderPaise !== undefined && sellingPaise < offer.minOrderPaise) continue;
    const discount = paymentOfferDiscount(offer, sellingPaise);
    if (discount > 0 && (!best || sellingPaise - discount < best.paise)) {
      best = { paise: sellingPaise - discount, offerName: offer.name };
    }
  }
  return best;
}

export type PriceDisplay = {
  /** Always the selling price (flash price while live). D-30. */
  sellingPaise: Paise;
  priceSource: 'regular' | 'flash';
  mrpPaise?: Paise;
  savings?: { paise: Paise; percent: number };
  effective?: { paise: Paise; offerName: string };
  emiFromPaise?: Paise;
};

/** Everything the PriceBlock shows, decided in one place (D-30–33, D-36, D-140). */
export function priceDisplay(input: {
  regularPaise: Paise;
  mrpPaise?: Paise;
  categoryId: string;
  flashSale?: FlashSale;
  paymentOffers: PaymentOffer[];
  emiPlans: EmiPlan[];
  now: number;
}): PriceDisplay {
  const { paise, source } = unitPriceWithFlash(input.regularPaise, input.flashSale, input.now);
  const noCostPlanIds = new Set(
    input.paymentOffers.flatMap((o) =>
      o.kind === 'noCostEmi' &&
      input.now >= o.validFrom &&
      input.now < o.validTo &&
      (!o.categoryIds || o.categoryIds.includes(input.categoryId)) &&
      (o.minOrderPaise === undefined || paise >= o.minOrderPaise)
        ? input.emiPlans
            .filter(
              (p) => p.tenureMonths === o.tenureMonths && (!o.banks || o.banks.includes(p.bank)),
            )
            .map((p) => p.id)
        : [],
    ),
  );
  const s = savings(input.mrpPaise, paise);
  const effective = effectivePrice(paise, input.categoryId, input.paymentOffers, input.now);
  const emi = emiFrom(paise, input.emiPlans, noCostPlanIds);
  return {
    sellingPaise: paise,
    priceSource: source,
    ...(s ? { mrpPaise: input.mrpPaise!, savings: s } : {}),
    ...(effective ? { effective } : {}),
    ...(emi !== undefined ? { emiFromPaise: emi } : {}),
  };
}
