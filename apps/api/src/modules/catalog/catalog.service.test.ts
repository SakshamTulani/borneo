import { describe, expect, it } from 'vitest';
import type { CategoryDto, PaymentOffer } from '@borneo/shared';
import { AppError } from '../../errors';
import { emptyCatalogDeps } from '../../test/factories';
import type { ListingQuery, ListingRow, VariantState } from './catalog.repository';
import { createCatalogService, encodeCursor, type CatalogDeps } from './catalog.service';

const NOW = 1_000_000;

const audio: CategoryDto = {
  id: 'cat-audio',
  slug: 'audio',
  name: 'Audio',
  parentId: null,
  depth: 'full',
  returnPolicy: 'return',
  config: { filters: ['anc'], specGroups: [], compare: [] },
};

const row = (slug: string, over: Partial<ListingRow> = {}): ListingRow => ({
  id: slug,
  slug,
  name: slug,
  categoryId: 'cat-audio',
  categorySlug: 'audio',
  lineName: 'Echo Buds',
  tier: 'value',
  status: 'live',
  pricePaise: 100_000,
  launched: '2026-01-01',
  ...over,
});

const variantOf = (productId: string, over: Partial<VariantState> = {}): VariantState => ({
  id: `${productId}-v`,
  productId,
  sku: `${productId}-sku`,
  options: {},
  pricePaise: 100_000,
  mrpPaise: 120_000,
  preorderCap: null,
  preorderSold: 0,
  unitsAvailable: 5,
  flashSales: [],
  ...over,
});

function setup(slugs: string[], over: Partial<CatalogDeps> = {}) {
  const calls: ListingQuery[] = [];
  const service = createCatalogService(
    emptyCatalogDeps({
      now: () => NOW,
      findCategoryBySlug: async (slug) =>
        slug === 'audio'
          ? {
              category: audio,
              defs: [{ key: 'anc', label: 'ANC', type: 'bool', filterable: true, compat: false }],
            }
          : undefined,
      listProducts: async (q) => {
        calls.push(q);
        return slugs.map((s) => row(s));
      },
      loadVariantStates: async (ids) => ids.map((id) => variantOf(id)),
      ...over,
    }),
  );
  return { service, calls };
}

describe('catalog service', () => {
  it('returns a next cursor only when another page exists', async () => {
    const full = await setup(['a', 'b', 'c']).service.listProducts({
      limit: 2,
      sort: 'newest',
      filters: {},
    });
    expect(full.items.map((i) => i.slug)).toEqual(['a', 'b']);
    expect(full.nextCursor).toBe(encodeCursor('2026-01-01', 'b'));

    const last = await setup(['a', 'b']).service.listProducts({
      limit: 2,
      sort: 'newest',
      filters: {},
    });
    expect(last.nextCursor).toBeNull();
  });

  it('D-18: resolves the category, parses filters and decodes the cursor for the repository', async () => {
    const { service, calls } = setup([]);
    await service.listProducts({
      category: 'audio',
      cursor: encodeCursor(150_000, 'echo-buds-1'),
      limit: 5,
      sort: 'price_asc',
      maxPricePaise: 300_000,
      filters: { anc: 'true' },
    });
    expect(calls).toEqual([
      {
        categoryId: 'cat-audio',
        filters: [{ key: 'anc', kind: 'isTrue' }],
        sort: 'price_asc',
        maxPricePaise: 300_000,
        after: { key: 150_000, slug: 'echo-buds-1' },
        limit: 5,
      },
    ]);
  });

  it('D-18: rejects filters the category does not configure, or without a category', async () => {
    const { service } = setup([]);
    await expect(
      service.listProducts({
        category: 'audio',
        limit: 5,
        sort: 'newest',
        filters: { colour: 'red' },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'UNKNOWN_FILTER',
      details: { key: 'colour' },
    });
    await expect(
      service.listProducts({
        category: 'audio',
        limit: 5,
        sort: 'newest',
        filters: { anc: 'yes' },
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_FILTER' });
    await expect(
      service.listProducts({ limit: 5, sort: 'newest', filters: { anc: 'true' } }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'UNKNOWN_FILTER' });
  });

  it('rejects an unknown category with CATEGORY_NOT_FOUND', async () => {
    await expect(
      setup([]).service.listProducts({ category: 'nope', limit: 5, sort: 'newest', filters: {} }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'CATEGORY_NOT_FOUND' });
  });

  it('rejects a tampered or mismatched cursor with INVALID_CURSOR', async () => {
    const { service } = setup([]);
    for (const [cursor, sort] of [
      [encodeCursor('2026-01-01', "x' or 1=1"), 'newest'],
      [encodeCursor('2026-01-01', 'a'), 'price_asc'],
      [encodeCursor(5, 'a'), 'newest'],
      ['not json', 'newest'],
    ] as const) {
      const err = await service
        .listProducts({ cursor, limit: 5, sort, filters: {} })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toMatchObject({ statusCode: 400, code: 'INVALID_CURSOR' });
    }
  });

  it('D-30: cards headline the selling price with genuine MRP savings', async () => {
    const { items } = await setup(['a']).service.listProducts({
      limit: 5,
      sort: 'newest',
      filters: {},
    });
    expect(items[0]).toMatchObject({
      availability: 'inStock',
      price: {
        sellingPaise: 100_000,
        priceSource: 'regular',
        mrpPaise: 120_000,
        savings: { paise: 20_000, percent: 16 },
      },
      flash: null,
      rating: { average: null, count: 0 },
    });
  });

  it('D-19: cards price the cheapest buyable variant; a live flash price counts', async () => {
    const sale = {
      id: 'f',
      variantId: 'a-flash',
      salePricePaise: 80_000,
      startsAt: NOW - 1,
      endsAt: NOW + 60_000,
      cap: 10,
      sold: 7,
      perCustomerLimit: 1 as const,
    };
    const { items } = await setup(['a'], {
      loadVariantStates: async () => [
        variantOf('a', { id: 'a-cheap', pricePaise: 50_000, unitsAvailable: 0 }),
        variantOf('a', { id: 'a-flash', pricePaise: 110_000, flashSales: [sale] }),
      ],
    }).service.listProducts({ limit: 5, sort: 'newest', filters: {} });
    expect(items[0]!.price).toMatchObject({ sellingPaise: 80_000, priceSource: 'flash' });
    expect(items[0]!.flash).toEqual({ endsAt: NOW + 60_000, lowStockCount: 3 });
  });

  it('D-140: no flash badge when the flash variant is not the one the card prices', async () => {
    const sale = {
      id: 'f',
      variantId: 'a-flash',
      salePricePaise: 80_000,
      startsAt: NOW - 1,
      endsAt: NOW + 60_000,
      cap: 10,
      sold: 7,
      perCustomerLimit: 1 as const,
    };
    const { items } = await setup(['a'], {
      loadVariantStates: async () => [
        variantOf('a', { id: 'a-cheap', pricePaise: 50_000 }),
        variantOf('a', {
          id: 'a-flash',
          pricePaise: 110_000,
          flashSales: [sale],
          unitsAvailable: 0,
        }),
      ],
    }).service.listProducts({ limit: 5, sort: 'newest', filters: {} });
    expect(items[0]!.price).toMatchObject({ sellingPaise: 50_000, priceSource: 'regular' });
    expect(items[0]!.flash).toBeNull();
  });

  it('D-32: shows an effective price only for an offer everyone paying that way gets', async () => {
    const bank: PaymentOffer = {
      kind: 'bank',
      id: 'b',
      name: 'Demo Bank cards',
      methods: ['card'],
      discount: { kind: 'flat', amountPaise: 10_000 },
      appliesToAll: true,
      validFrom: 0,
      validTo: NOW + 1,
    };
    const { items } = await setup(['a'], {
      loadOfferBook: async () => ({ coupons: [], paymentOffers: [bank], emiPlans: [] }),
    }).service.listProducts({ limit: 5, sort: 'newest', filters: {} });
    expect(items[0]!.price.effective).toEqual({ paise: 90_000, offerName: 'Demo Bank cards' });
  });

  it('D-150: averages verified reviews to one decimal', async () => {
    const { items } = await setup(['a'], {
      loadRatings: async () => new Map([['a', { average: 4.333, count: 3 }]]),
    }).service.listProducts({ limit: 5, sort: 'newest', filters: {} });
    expect(items[0]!.rating).toEqual({ average: 4.3, count: 3 });
  });

  it('D-180: cards lead with the first photo; no photo is null, not a placeholder', async () => {
    const lead = { src: 'https://images.example.com/a-1', alt: 'A' };
    const { items } = await setup(['a', 'b'], {
      loadImages: async () =>
        new Map([['a', [lead, { src: 'https://images.example.com/a-2', alt: 'A, another view' }]]]),
    }).service.listProducts({ limit: 5, sort: 'newest', filters: {} });
    expect(items.map((i) => i.image)).toEqual([lead, null]);
  });

  it('returns 404 PRODUCT_NOT_FOUND for an unknown product', async () => {
    await expect(setup([]).service.getProduct('nope')).rejects.toMatchObject({
      statusCode: 404,
      code: 'PRODUCT_NOT_FOUND',
    });
  });
});
