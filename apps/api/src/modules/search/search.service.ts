import {
  SEARCH_CANDIDATES_MAX,
  exactMatch,
  keepRelevant,
  namedCategory,
  normalizeQuery,
  searchIntent,
  type CategoryDto,
  type ProductSummary,
  type SearchCategory,
  type SearchResult,
  type SynonymGroup,
} from '@borneo/shared';
import type { ListingRow } from '../catalog/index';
import type { ExactCandidate, SearchQuery, SearchRow } from './search.repository';

export type SearchDeps = {
  listSynonyms: () => Promise<SynonymGroup[]>;
  listCategories: () => Promise<CategoryDto[]>;
  searchProducts: (query: SearchQuery) => Promise<SearchRow[]>;
  findExactCandidates: (query: string) => Promise<ExactCandidate[]>;
  /** The catalog's card builder (prices, stock, flash, rating, photo). */
  summarize: (rows: ListingRow[]) => Promise<ProductSummary[]>;
};

/** Matching categories shown with suggestions (D-112). */
export const MAX_SEARCH_CATEGORIES = 3;
/** No-results fallback sizes (D-114). */
export const FALLBACK_ALTERNATIVES = 4;
export const FALLBACK_CATEGORIES = 4;

const toCategory = (c: { slug: string; name: string }): SearchCategory => ({
  slug: c.slug,
  name: c.name,
});

export function createSearchService(deps: SearchDeps) {
  return {
    /**
     * Exact model/SKU → PDP (D-110), synonyms (D-111), products with price and stock plus
     * categories (D-112), price intent (D-113), and a fallback when nothing matches (D-114).
     */
    async search(raw: string, limit: number, offset = 0): Promise<SearchResult> {
      const [synonyms, categories] = await Promise.all([
        deps.listSynonyms(),
        deps.listCategories(),
      ]);
      const intent = searchIntent(raw, synonyms);
      const named = namedCategory(intent.terms, categories);
      const price =
        intent.maxPricePaise !== undefined ? { maxPricePaise: intent.maxPricePaise } : {};

      // A price phrase means a browse, not a model name.
      const exactLookup =
        intent.maxPricePaise === undefined && intent.text
          ? deps.findExactCandidates(normalizeQuery(raw))
          : Promise.resolve([]);
      const rowsLookup =
        intent.terms.length === 0 && intent.maxPricePaise === undefined
          ? Promise.resolve([])
          : deps.searchProducts({
              // Naming a category lists it whole; other words are matched as text.
              terms: named ? [] : intent.terms,
              ...(named ? { categoryId: named.id } : {}),
              ...price,
              // Rank every candidate, then page: the relevance cut is relative to the best hit.
              limit: SEARCH_CANDIDATES_MAX,
            });
      const [candidates, hits] = await Promise.all([exactLookup, rowsLookup]);
      const relevant = keepRelevant(hits);
      const rows = relevant.slice(offset, offset + limit);

      const exact = candidates
        .map((c) => ({ slug: c.slug, hit: exactMatch(raw, c) }))
        .find((c) => c.hit !== null);
      const products = await deps.summarize(rows);

      const bySlug = new Map(categories.map((c) => [c.slug, c]));
      const matched = [
        ...(named ? [named] : []),
        ...rows.map((r) => bySlug.get(r.categorySlug)).filter((c) => c !== undefined),
      ];
      const matchedCategories = [...new Map(matched.map((c) => [c.slug, toCategory(c)])).values()];

      let fallback: SearchResult['fallback'] = null;
      if (relevant.length === 0 && !exact) {
        const alternatives = named
          ? await deps.summarize(
              await deps.searchProducts({
                terms: [],
                categoryId: named.id,
                order: 'price',
                limit: FALLBACK_ALTERNATIVES,
              }),
            )
          : [];
        // Configured category order stands in for popularity until there is sales data (D-183).
        fallback = {
          alternatives,
          categories: categories.slice(0, FALLBACK_CATEGORIES).map(toCategory),
        };
      }

      return {
        query: raw,
        exactMatch: exact ? { slug: exact.slug, sku: exact.hit!.sku } : null,
        interpretation: {
          text: intent.text,
          ...price,
          ...(named ? { category: toCategory(named) } : {}),
        },
        categories: matchedCategories.slice(0, MAX_SEARCH_CATEGORIES),
        products,
        total: relevant.length,
        nextCursor: offset + limit < relevant.length ? String(offset + limit) : null,
        fallback,
      };
    },
  };
}

export type SearchService = ReturnType<typeof createSearchService>;
