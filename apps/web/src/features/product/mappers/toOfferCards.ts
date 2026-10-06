import { formatInr, type ProductOffer } from '@borneo/shared';
import { formatDay } from '@/shared/lib/format';
import type { OfferCardView } from '../model';

/** Offer terms in plain words: minimum order and end date (D-34, D-40). */
export function toOfferCards(offers: ProductOffer[]): OfferCardView[] {
  return offers.map((o) => ({
    id: o.id,
    kind: o.kind,
    title: o.name,
    description: [
      o.minOrderPaise !== undefined ? `On orders of ${formatInr(o.minOrderPaise)} or more.` : null,
      `Valid till ${formatDay(new Date(o.validTo).toISOString())}.`,
    ]
      .filter(Boolean)
      .join(' '),
    ...(o.code ? { code: o.code } : {}),
    status: o.status,
    ...(o.reason ? { reason: o.reason } : {}),
  }));
}
