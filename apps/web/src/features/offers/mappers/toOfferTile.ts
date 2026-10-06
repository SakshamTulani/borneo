import { formatInr, type OfferHighlight } from '@borneo/shared';
import { formatDateTime, formatDay } from '@/shared/lib/format';
import type { OfferTile } from '../model';

const LABEL = {
  flash: 'Flash sale',
  bank: 'Bank offer',
  noCostEmi: 'No-cost EMI',
  coupon: 'Coupon',
};

export function toOfferTile(o: OfferHighlight): OfferTile {
  if (o.kind === 'flash') {
    return {
      id: o.id,
      kind: 'flash',
      label: LABEL.flash,
      title: `${o.productName} at ${formatInr(o.salePricePaise)}`,
      terms: `Usually ${formatInr(o.regularPricePaise)} · ends ${formatDateTime(new Date(o.endsAt).toISOString())}`,
      product: { slug: o.productSlug, sku: o.sku },
      endsAt: o.endsAt,
    };
  }
  const terms = [
    o.minOrderPaise !== undefined
      ? `On orders of ${formatInr(o.minOrderPaise)} or more`
      : 'No minimum order',
    ...(o.scoped ? ['selected categories'] : []),
    // Coupons never apply to flash sale or bundle prices (D-36, D-37).
    ...(o.kind === 'coupon' ? ['not on flash sale or bundle prices'] : []),
    `till ${formatDay(new Date(o.validTo).toISOString())}`,
  ].join(' · ');
  return {
    id: o.id,
    kind: o.kind,
    label: LABEL[o.kind],
    title: o.name,
    terms,
    ...(o.code ? { code: o.code } : {}),
    endsAt: o.validTo,
  };
}
