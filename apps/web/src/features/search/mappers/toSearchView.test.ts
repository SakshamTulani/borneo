import type { SearchResult } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { summaryFixture } from '@/test/fixtures';
import { interpretationLabel, toSearchView, toSuggestions } from './toSearchView';

const result = (over: Partial<SearchResult> = {}): SearchResult => ({
  query: 'phone under 30000',
  exactMatch: null,
  interpretation: {
    text: 'phone',
    maxPricePaise: 3_000_000,
    category: { slug: 'smartphones', name: 'Smartphones' },
  },
  categories: [{ slug: 'smartphones', name: 'Smartphones' }],
  products: [summaryFixture()],
  fallback: null,
  ...over,
});

describe('search mappers', () => {
  it('D-113: labels the price intent in plain words', () => {
    expect(interpretationLabel(result().interpretation)).toBe('Smartphones under ₹30,000');
    expect(interpretationLabel({ text: '', maxPricePaise: 500_000 })).toBe('Under ₹5,000');
    expect(interpretationLabel({ text: 'tv', category: { slug: 'tvs', name: 'TVs' } })).toBe('TVs');
    expect(interpretationLabel({ text: 'pulse' })).toBeUndefined();
  });

  it('D-113: links to the category page with the cap in whole rupees', () => {
    expect(toSearchView(result()).interpretation).toEqual({
      label: 'Smartphones under ₹30,000',
      category: { slug: 'smartphones', name: 'Smartphones', maxPrice: 30_000 },
    });
  });

  it('D-110: an exact SKU match carries the variant to open', () => {
    expect(
      toSearchView(result({ exactMatch: { slug: 'pulse-4', sku: 'BP4-6-128-FOR' } })).exactMatch,
    ).toEqual({ slug: 'pulse-4', variant: 'BP4-6-128-FOR' });
    expect(toSearchView(result({ exactMatch: { slug: 'pulse-4', sku: null } })).exactMatch).toEqual(
      { slug: 'pulse-4' },
    );
  });

  it('D-112: suggestions list categories first, then products with price and stock', () => {
    const rows = toSuggestions(
      result({ products: [summaryFixture({ availability: 'outOfStock' })] }),
    );
    expect(rows.map((r) => r.kind)).toEqual(['category', 'product']);
    expect(rows[1]).toMatchObject({
      name: 'Echo Buds 2',
      priceLabel: '₹3,499',
      stockLabel: 'Out of stock',
    });
  });
});
