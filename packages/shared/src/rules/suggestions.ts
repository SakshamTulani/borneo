import type { RelationEdge, RelationType } from '../contracts/catalog';

export type SuggestionSurface = 'pdp' | 'addToCart' | 'cart' | 'orderConfirmation' | 'payment';

/** Max suggestions per surface; none inside payment (D-73, D-123, D-124). */
export const SUGGESTION_LIMITS: Record<SuggestionSurface, number> = {
  pdp: 4,
  addToCart: 3,
  cart: 4,
  orderConfirmation: 4,
  payment: 0,
};

const TYPE_PRIORITY: RelationType[] = [
  'accessory',
  'consumable',
  'compatible',
  'complementary',
  'replacement',
  'bundle_member',
  'upgrade',
  'next_gen',
  'family_tier',
  'prev_gen',
];

/**
 * After adding to cart and on the cart, only add-ons to what is being bought, never alternatives
 * to it (other generations, tiers or upgrades) (D-199).
 */
const ADD_ON_TYPES: ReadonlySet<RelationType> = new Set([
  'accessory',
  'consumable',
  'compatible',
  'complementary',
  'replacement',
  'bundle_member',
]);
const ADD_ONS_ONLY: ReadonlySet<SuggestionSurface> = new Set(['addToCart', 'cart']);

/**
 * Cross-sell picks (D-124, D-126): every suggestion carries a reason; excludes products already
 * in the cart or owned; ordered by relation type, then curation rank; capped per surface.
 * The caller renders them unselected: nothing pre-ticked.
 */
export function pickSuggestions(input: {
  edges: RelationEdge[];
  surface: SuggestionSurface;
  exclude: ReadonlySet<string>;
  rank?: ReadonlyMap<string, number>;
}): { productId: string; reason: string; type: RelationType }[] {
  const seen = new Set<string>();
  return input.edges
    .filter(
      (e) =>
        e.reason.trim().length > 0 &&
        !input.exclude.has(e.toProductId) &&
        (!ADD_ONS_ONLY.has(input.surface) || ADD_ON_TYPES.has(e.type)),
    )
    .sort(
      (a, b) =>
        TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type) ||
        (input.rank?.get(a.toProductId) ?? Infinity) -
          (input.rank?.get(b.toProductId) ?? Infinity) ||
        a.toProductId.localeCompare(b.toProductId),
    )
    .filter((e) => !seen.has(e.toProductId) && seen.add(e.toProductId))
    .slice(0, SUGGESTION_LIMITS[input.surface])
    .map((e) => ({ productId: e.toProductId, reason: e.reason, type: e.type }));
}
