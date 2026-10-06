import { describe, expect, it } from 'vitest';
import type { RelationEdge } from '../contracts/catalog';
import { pickSuggestions } from './suggestions';

const e = (
  to: string,
  type: RelationEdge['type'],
  reason = `Fits your phone (${to})`,
): RelationEdge => ({ fromProductId: 'phone', toProductId: to, type, source: 'rule', reason });
const edges = [
  e('case', 'accessory'),
  e('pods', 'complementary'),
  e('cable', 'accessory'),
  e('watch', 'compatible'),
  e('charger', 'accessory'),
  e('tv', 'complementary'),
];

describe('suggestions', () => {
  it('D-124: at most 4 per surface and 3 at add-to-cart', () => {
    expect(pickSuggestions({ edges, surface: 'pdp', exclude: new Set() })).toHaveLength(4);
    expect(pickSuggestions({ edges, surface: 'addToCart', exclude: new Set() })).toHaveLength(3);
  });

  it('D-123: allowed on PDP, add-to-cart, cart and order confirmation', () => {
    for (const surface of ['pdp', 'addToCart', 'cart', 'orderConfirmation'] as const) {
      expect(pickSuggestions({ edges, surface, exclude: new Set() }).length).toBeGreaterThan(0);
    }
  });

  it('D-73: nothing inside payment', () => {
    expect(pickSuggestions({ edges, surface: 'payment', exclude: new Set() })).toEqual([]);
  });

  it('D-124: every suggestion has a reason; edges without one are skipped', () => {
    const picks = pickSuggestions({
      edges: [e('blank', 'accessory', ' '), e('case', 'accessory')],
      surface: 'cart',
      exclude: new Set(),
    });
    expect(picks).toEqual([
      { productId: 'case', reason: 'Fits your phone (case)', type: 'accessory' },
    ]);
  });

  it('D-126: excludes cart and owned items, orders by type then curation rank, no duplicates', () => {
    const picks = pickSuggestions({
      edges: [...edges, e('case', 'compatible')],
      surface: 'pdp',
      exclude: new Set(['cable']),
      rank: new Map([
        ['charger', 1],
        ['case', 2],
      ]),
    });
    expect(picks.map((s) => s.productId)).toEqual(['charger', 'case', 'watch', 'pods']);
  });

  it('D-199: after adding to cart and on the cart, only add-ons, never alternatives', () => {
    const mixed = [
      e('next', 'next_gen'),
      e('pro', 'family_tier'),
      e('up', 'upgrade'),
      e('case', 'accessory'),
    ];
    for (const surface of ['addToCart', 'cart'] as const) {
      expect(
        pickSuggestions({ edges: mixed, surface, exclude: new Set() }).map((s) => s.productId),
      ).toEqual(['case']);
    }
    expect(pickSuggestions({ edges: mixed, surface: 'pdp', exclude: new Set() })).toHaveLength(4);
  });
});
