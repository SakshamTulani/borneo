import {
  categoryDetailSchema,
  categoryDtoSchema,
  productDetailSchema,
  productSummarySchema,
  type ProductSummary,
} from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { seedData } from '../../db/seed/index';
import { catalogService } from '../../services';
import { TEST_NOW, useTestDb } from '../../test/db';
import { createHealthService } from '../health/index';

const db = useTestDb();
const app = buildApp({
  health: createHealthService({ demoMode: false, pingDatabase: async () => true }),
  catalog: catalogService(db, () => TEST_NOW.getTime()),
});
const get = (url: string) => app.inject({ method: 'GET', url });

async function allProducts(query: string, limit: number): Promise<ProductSummary[]> {
  const items: ProductSummary[] = [];
  let cursor: string | null = null;
  do {
    const res = await get(`/products?${query}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`);
    expect(res.statusCode).toBe(200);
    const page = res.json() as { items: ProductSummary[]; nextCursor: string | null };
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return items.map((p) => productSummarySchema.parse(p));
}

/** Listed seed products (D-17) in a category matching a predicate, by slug. */
const seeded = (category: string, match: (a: Record<string, unknown>) => boolean = () => true) =>
  seedData.products
    .filter((p) => p.category === category && p.status !== 'discontinued' && match(p.attributes))
    .map((p) => p.slug)
    .sort();
const slugs = (items: ProductSummary[]) => items.map((p) => p.slug).sort();

describe('GET /categories', () => {
  it('D-10: lists the launch categories in configured order with their config', async () => {
    const res = await get('/categories');
    expect(res.statusCode).toBe(200);
    const { items } = res.json() as { items: unknown[] };
    const categories = items.map((c) => categoryDtoSchema.parse(c));
    expect(categories.map((c) => c.slug)).toEqual([
      'smartphones',
      'audio',
      'wearables',
      'accessories',
      'smart-home',
      'tvs',
      'robot-vacuums',
    ]);
    expect(categories[0]).toMatchObject({ depth: 'full', returnPolicy: 'replacementOnly' });
    expect(categories[0]!.config.filters).toContain('ram_gb');
  });
});

describe('GET /categories/:slug', () => {
  it('D-18: offers filters in config order from listed products, with option labels', async () => {
    const res = await get('/categories/audio');
    expect(res.statusCode).toBe(200);
    const detail = categoryDetailSchema.parse(res.json());
    expect(detail.category.slug).toBe('audio');
    expect(detail.filters.map((f) => f.key)).toEqual(
      seedData.categories.find((c) => c.slug === 'audio')!.config.filters,
    );
    expect(detail.filters[0]).toMatchObject({
      kind: 'anyOf',
      options: expect.arrayContaining([{ value: 'tws', label: 'True wireless' }]),
    });
    expect(detail.priceRangePaise!.min).toBeLessThan(detail.priceRangePaise!.max);
    for (const cap of detail.priceCapsPaise) {
      expect(cap).toBeGreaterThanOrEqual(detail.priceRangePaise!.min);
      expect(cap).toBeLessThan(detail.priceRangePaise!.max);
    }
  });

  it('D-18: number filters offer minimums above the lowest value', async () => {
    const detail = categoryDetailSchema.parse((await get('/categories/smartphones')).json());
    const ram = detail.filters.find((f) => f.key === 'ram_gb');
    expect(ram).toMatchObject({ kind: 'atLeast', unit: 'GB' });
    expect(ram?.kind === 'atLeast' && ram.values.length).toBeGreaterThan(0);
  });

  it('returns 404 CATEGORY_NOT_FOUND for an unknown category', async () => {
    const res = await get('/categories/fridges');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: { code: 'CATEGORY_NOT_FOUND' } });
  });
});

describe('GET /products', () => {
  it('D-17: lists live and pre-order products in a category, never discontinued ones', async () => {
    const phones = await allProducts('category=smartphones', 50);
    expect(slugs(phones)).toEqual(seeded('smartphones'));
    expect(slugs(phones)).toContain('nova-4');
    expect(slugs(phones)).not.toContain('pulse-3');
    expect(phones.find((p) => p.slug === 'nova-4')!.availability).toBe('preorder');
  });

  it('D-30: shows the cheapest variant selling price with its genuine MRP', async () => {
    const phones = await allProducts('category=smartphones', 50);
    expect(phones.find((p) => p.slug === 'pulse-4')!.price).toMatchObject({
      sellingPaise: 1_499_900,
      mrpPaise: 1_699_900,
      priceSource: 'regular',
    });
  });

  it('D-140: a live flash sale prices the card and shows its real end time', async () => {
    const audio = await allProducts('category=audio', 50);
    const buds = audio.find((p) => p.slug === 'echo-buds-2')!;
    expect(buds.price).toMatchObject({ sellingPaise: 279_900, priceSource: 'flash' });
    expect(buds.flash?.endsAt).toBe(TEST_NOW.getTime() + 22 * 3_600_000);
  });

  it.each(['newest', 'price_asc', 'price_desc'])(
    'pages with an opaque cursor without gaps or duplicates (sort %s)',
    async (sort) => {
      const all = await allProducts(`sort=${sort}`, 50);
      const paged = await allProducts(`sort=${sort}`, 7);
      expect(paged.map((p) => p.slug)).toEqual(all.map((p) => p.slug));
      expect(new Set(paged.map((p) => p.slug)).size).toBe(paged.length);
      expect(all.length).toBeGreaterThan(40);
    },
  );

  it('D-19: sorts by price in either direction', async () => {
    const prices = (items: ProductSummary[]) => items.map((p) => p.price.sellingPaise);
    const asc = prices(await allProducts('category=smartphones&sort=price_asc', 50));
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = prices(await allProducts('category=smartphones&sort=price_desc', 50));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('D-19: newest first by default', async () => {
    const launched = new Map(seedData.products.map((p) => [p.slug, p.launchedAt ?? '']));
    const order = (await allProducts('category=smartphones', 50)).map((p) => launched.get(p.slug)!);
    expect(order).toEqual([...order].sort().reverse());
  });

  it('D-18: a number filter is a minimum', async () => {
    const items = await allProducts('category=smartphones&ram_gb=8', 50);
    expect(slugs(items)).toEqual(seeded('smartphones', (a) => (a.ram_gb as number) >= 8));
    expect(items.length).toBeGreaterThan(0);
  });

  it('D-18: options match any selected value; yes/no narrows to Yes; filters combine', async () => {
    const formFactor = (a: Record<string, unknown>) =>
      ['tws', 'over_ear'].includes(a.form_factor as string);
    expect(slugs(await allProducts('category=audio&form_factor=tws,over_ear', 50))).toEqual(
      seeded('audio', formFactor),
    );
    expect(slugs(await allProducts('category=audio&anc=true', 50))).toEqual(
      seeded('audio', (a) => a.anc === true),
    );
    const both = await allProducts('category=audio&form_factor=tws,over_ear&anc=true', 50);
    expect(slugs(both)).toEqual(seeded('audio', (a) => formFactor(a) && a.anc === true));
    expect(both.length).toBeGreaterThan(0);
  });

  it('D-18: price is a maximum on the lowest regular price', async () => {
    const items = await allProducts('category=smartphones&maxPricePaise=2000000', 50);
    const cheapest = (slug: string) =>
      Math.min(...seedData.products.find((p) => p.slug === slug)!.variants.map((v) => v.price));
    expect(slugs(items)).toEqual(seeded('smartphones').filter((s) => cheapest(s) <= 20_000));
  });

  it('D-18: rejects unconfigured or invalid filters', async () => {
    for (const [url, code] of [
      ['/products?category=smartphones&colour=red', 'UNKNOWN_FILTER'],
      ['/products?category=smartphones&ram_gb=lots', 'INVALID_FILTER'],
      ['/products?ram_gb=8', 'UNKNOWN_FILTER'],
    ] as const) {
      const res = await get(url);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: { code } });
    }
  });

  it('returns 404 CATEGORY_NOT_FOUND for an unknown category', async () => {
    const res = await get('/products?category=fridges');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'CATEGORY_NOT_FOUND', message: 'No category "fridges"' },
    });
  });

  it('returns 400 VALIDATION when the limit is above 50 or the sort is unknown', async () => {
    for (const url of ['/products?limit=51', '/products?sort=popular']) {
      const res = await get(url);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: { code: 'VALIDATION' } });
    }
  });
});

describe('GET /products/:slug', () => {
  const detail = async (slug: string) => {
    const res = await get(`/products/${slug}`);
    expect(res.statusCode).toBe(200);
    return productDetailSchema.parse(res.json());
  };

  it('D-14: returns variants, spec groups from config and FAQs', async () => {
    const p = await detail('pulse-4');
    expect(p).toMatchObject({ name: 'Borneo Pulse 4', category: { slug: 'smartphones' } });
    expect(p.optionKeys).toEqual(['colour', 'storage']);
    expect(p.variants.length).toBeGreaterThan(1);
    expect(p.specs.map((g) => g.title)).toEqual([
      'Display',
      'Performance',
      'Battery',
      'Camera',
      'Connectivity',
      'Build',
    ]);
    expect(p.specs.flatMap((g) => g.rows)).toContainEqual({ label: 'Connector', value: 'USB-C' });
    expect(p.faqs.length).toBeGreaterThan(0);
  });

  it('D-84: states the return policy in plain language', async () => {
    expect((await detail('pulse-4')).returnPolicy).toMatch(/^Replacement within 7 days/);
    expect((await detail('echo-buds-2')).returnPolicy).toMatch(/^Return within 7 days/);
  });

  it('D-22: compatibility facts only from filled structured attributes', async () => {
    const p = await detail('pulse-4');
    expect(p.compatibility).toContainEqual({ key: 'connector', text: 'Connector: USB-C' });
    expect(p.compatibility.every((f) => f.text.length > 0)).toBe(true);
  });

  it('D-124: at most 4 suggestions, each with a reason, none of them discontinued', async () => {
    const p = await detail('pulse-4');
    expect(p.suggestions.length).toBeGreaterThan(0);
    expect(p.suggestions.length).toBeLessThanOrEqual(4);
    for (const s of p.suggestions) {
      expect(s.reason.length).toBeGreaterThan(0);
      expect(s.product.status).not.toBe('discontinued');
      expect(s.product.slug).not.toBe('pulse-4');
    }
  });

  it('D-36: coupons show as not applicable on a live flash price', async () => {
    const p = await detail('echo-buds-2');
    const flash = p.variants.find((v) => v.price.priceSource === 'flash')!;
    const regular = p.variants.find((v) => v.price.priceSource === 'regular');
    expect(
      flash.offers.filter((o) => o.kind === 'coupon').every((o) => o.status === 'notApplicable'),
    ).toBe(true);
    if (regular)
      expect(regular.offers.some((o) => o.kind === 'coupon' && o.status === 'available')).toBe(
        true,
      );
  });

  it('D-17: a discontinued product keeps its page, is not sold and points to its successor', async () => {
    const p = await detail('pulse-3');
    expect(p.status).toBe('discontinued');
    expect(p.variants.every((v) => v.availability === 'outOfStock')).toBe(true);
    expect(p.successor).toEqual({ slug: 'pulse-4', name: 'Borneo Pulse 4' });
  });

  it('D-64: a pre-order shows its expected dispatch range', async () => {
    const p = await detail('nova-4');
    expect(p.status).toBe('preorder');
    expect(p.dispatch!.from <= p.dispatch!.to).toBe(true);
    expect(p.variants.some((v) => v.availability === 'preorder')).toBe(true);
  });

  it('returns 404 PRODUCT_NOT_FOUND for an unknown product and 400 for a bad slug', async () => {
    const res = await get('/products/no-such-phone');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: { code: 'PRODUCT_NOT_FOUND' } });
    expect((await get('/products/Bad_Slug')).statusCode).toBe(400);
  });
});
