import type { PriceDisplay, ProductSummary } from '@borneo/shared';
import type { PriceBlockProps } from '@/shared/ui/commerce/PriceBlock';
import type { StatusBadgeProps } from '@/shared/ui/commerce/StatusBadge';
import type { CatalogCard } from '../model';

/** PriceBlock props from the API's price display; values come from the pricing rule (D-30–33). */
export function toPriceBlock(price: PriceDisplay): PriceBlockProps {
  return {
    sellingPaise: price.sellingPaise,
    ...(price.mrpPaise !== undefined ? { mrpPaise: price.mrpPaise } : {}),
    ...(price.savings ? { savings: price.savings } : {}),
    ...(price.effective ? { effective: price.effective } : {}),
    ...(price.emiFromPaise !== undefined ? { emiFromPaise: price.emiFromPaise } : {}),
  };
}

/**
 * Cards badge only what is unusual: a live flash sale (with "Only N left" from the real cap,
 * D-148), pre-order, out of stock. "In stock" is left to the delivery check (D-51, D-54).
 */
export function cardBadges(p: Pick<ProductSummary, 'availability' | 'flash'>): StatusBadgeProps[] {
  const badges: StatusBadgeProps[] = [];
  if (p.flash) badges.push({ kind: 'flashSale' });
  if (p.flash?.lowStockCount !== undefined)
    badges.push({ kind: 'lowStock', count: p.flash.lowStockCount });
  if (p.availability === 'preorder') badges.push({ kind: 'preorder' });
  if (p.availability === 'outOfStock') badges.push({ kind: 'outOfStock' });
  return badges;
}

export function toCatalogCard(p: ProductSummary): CatalogCard {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    familyLabel: p.lineName,
    rating: {
      ...(p.rating.average !== null ? { value: p.rating.average } : {}),
      count: p.rating.count,
    },
    price: toPriceBlock(p.price),
    badges: cardBadges(p),
    availability: p.availability,
  };
}
