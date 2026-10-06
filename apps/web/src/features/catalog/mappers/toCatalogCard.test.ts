import { describe, expect, it } from 'vitest';
import type { ProductSummary } from '@borneo/shared';
import { cardBadges, toCatalogCard } from './toCatalogCard';

const summary: ProductSummary = {
  id: 'p1',
  slug: 'echo-buds-2',
  name: 'Echo Buds 2',
  categorySlug: 'audio',
  lineName: 'Echo Buds',
  tier: 'value',
  status: 'live',
  availability: 'inStock',
  price: {
    sellingPaise: 279_900,
    priceSource: 'flash',
    mrpPaise: 499_900,
    savings: { paise: 220_000, percent: 44 },
  },
  flash: { endsAt: 1, lowStockCount: 3 },
  rating: { average: null, count: 0 },
  image: { src: 'https://images.unsplash.com/photo-1', alt: 'Echo Buds 2' },
};

describe('toCatalogCard', () => {
  it('maps price and rating without inventing values (D-30, D-150)', () => {
    expect(toCatalogCard(summary)).toMatchObject({
      slug: 'echo-buds-2',
      familyLabel: 'Echo Buds',
      rating: { count: 0 },
      price: { sellingPaise: 279_900, mrpPaise: 499_900, savings: { paise: 220_000, percent: 44 } },
    });
    expect(toCatalogCard(summary).rating).not.toHaveProperty('value');
  });

  it('D-180: sizes the lead photo square and leaves image out when there is none', () => {
    const card = toCatalogCard(summary);
    expect(card.image?.alt).toBe('Echo Buds 2');
    expect(card.image?.src).toContain('w=1200&h=1200');
    expect(card.image?.srcSet).toContain('400w');
    expect(toCatalogCard({ ...summary, image: null })).not.toHaveProperty('image');
  });

  it('badges a live flash sale with the real remaining count only (D-148)', () => {
    expect(cardBadges(summary)).toEqual([{ kind: 'flashSale' }, { kind: 'lowStock', count: 3 }]);
    expect(cardBadges({ availability: 'inStock', flash: { endsAt: 1 } })).toEqual([
      { kind: 'flashSale' },
    ]);
    expect(cardBadges({ availability: 'inStock', flash: null })).toEqual([]);
    expect(cardBadges({ availability: 'preorder', flash: null })).toEqual([{ kind: 'preorder' }]);
    expect(cardBadges({ availability: 'outOfStock', flash: null })).toEqual([
      { kind: 'outOfStock' },
    ]);
  });
});
