import type { CategoryDto, ProductSummary } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { emptySearchDeps } from '../../test/factories';
import type { SearchQuery, SearchRow } from './search.repository';
import { createSearchService } from './search.service';

const phones: CategoryDto = {
  id: 'c-phones',
  slug: 'smartphones',
  name: 'Smartphones',
  parentId: null,
  depth: 'full',
  returnPolicy: 'replacementOnly',
  config: { filters: [], specGroups: [], compare: [] },
};

const row = (slug: string, score = 1): SearchRow => ({
  id: slug,
  slug,
  name: slug,
  categoryId: phones.id,
  categorySlug: phones.slug,
  lineName: 'Line',
  tier: 'value',
  status: 'live',
  pricePaise: 100_000,
  launched: '2026-01-01',
  modelNumber: slug.toUpperCase(),
  skus: [],
  score,
});

/** Cards echo rows by slug: the catalog's pricing is tested elsewhere. */
const summarize = async (rows: { slug: string }[]) =>
  rows.map((r) => ({ slug: r.slug }) as ProductSummary);

describe('search service', () => {
  it('D-113: a named category with a price lists that category under the cap, no text match', async () => {
    const calls: SearchQuery[] = [];
    const service = createSearchService(
      emptySearchDeps({
        listSynonyms: async () => [{ term: 'smartphone', synonyms: ['phone'] }],
        listCategories: async () => [phones],
        searchProducts: async (q) => {
          calls.push(q);
          return [row('pulse-4')];
        },
        summarize,
      }),
    );
    const r = await service.search('Phone under 20k', 10);
    expect(calls).toEqual([
      { terms: [], categoryId: 'c-phones', maxPricePaise: 2_000_000, limit: 10 },
    ]);
    expect(r.interpretation.category?.slug).toBe('smartphones');
    expect(r.products.map((p) => p.slug)).toEqual(['pulse-4']);
  });

  it('D-110: no exact lookup for a price phrase; the rule decides among candidates', async () => {
    const looked: string[] = [];
    const service = createSearchService(
      emptySearchDeps({
        findExactCandidates: async (q) => {
          looked.push(q);
          return [
            { slug: 'pulse-4-pro', name: 'Borneo Pulse 4 Pro', modelNumber: 'X', skus: [] },
            { slug: 'pulse-4', name: 'Borneo Pulse 4', modelNumber: 'Y', skus: [] },
          ];
        },
      }),
    );
    expect((await service.search('Pulse  4', 5)).exactMatch).toEqual({
      slug: 'pulse-4',
      sku: null,
    });
    await service.search('pulse under 20000', 5);
    expect(looked).toEqual(['pulse 4']);
  });

  it('D-182: drops weak matches beside a strong one before pricing them', async () => {
    const service = createSearchService(
      emptySearchDeps({
        searchProducts: async () => [row('case', 1), row('cable', 0.4)],
        summarize,
      }),
    );
    expect((await service.search('case', 5)).products.map((p) => p.slug)).toEqual(['case']);
  });

  it('D-114: no fallback when an exact match exists even if nothing is listed', async () => {
    const service = createSearchService(
      emptySearchDeps({
        findExactCandidates: async () => [
          { slug: 'pulse-3', name: 'Borneo Pulse 3', modelNumber: 'BP3', skus: [] },
        ],
      }),
    );
    const r = await service.search('pulse 3', 5);
    expect(r.exactMatch?.slug).toBe('pulse-3');
    expect(r.fallback).toBeNull();
  });
});
