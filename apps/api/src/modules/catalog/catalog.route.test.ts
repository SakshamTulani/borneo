import { categoryDtoSchema, productSummarySchema, type ProductSummary } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { catalogService } from '../../services';
import { useTestDb } from '../../test/db';
import { createHealthService } from '../health/index';

const db = useTestDb();
const app = buildApp({
  health: createHealthService({ demoMode: false, pingDatabase: async () => true }),
  catalog: catalogService(db),
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
  return items;
}

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

describe('GET /products', () => {
  it('lists live and pre-order products in a category, never discontinued ones', async () => {
    const phones = await allProducts('category=smartphones', 50);
    const slugs = phones.map((p) => p.slug);
    expect(slugs).toContain('nova-4');
    expect(slugs).not.toContain('pulse-3');
    expect(phones.every((p) => p.categorySlug === 'smartphones')).toBe(true);
    for (const p of phones) productSummarySchema.parse(p);
  });

  it('D-30: shows the cheapest variant selling price with its genuine MRP', async () => {
    const phones = await allProducts('category=smartphones', 50);
    expect(phones.find((p) => p.slug === 'pulse-4')).toMatchObject({
      pricePaise: 1_499_900,
      mrpPaise: 1_699_900,
    });
  });

  it('pages with an opaque cursor without gaps or duplicates', async () => {
    const all = await allProducts('', 50);
    const paged = await allProducts('', 7);
    expect(paged.map((p) => p.slug)).toEqual(all.map((p) => p.slug));
    expect(new Set(paged.map((p) => p.slug)).size).toBe(paged.length);
    expect(all.length).toBeGreaterThan(40);
  });

  it('returns 404 CATEGORY_NOT_FOUND for an unknown category', async () => {
    const res = await get('/products?category=fridges');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'CATEGORY_NOT_FOUND', message: 'No category "fridges"' },
    });
  });

  it('returns 400 VALIDATION when the limit is above 50', async () => {
    const res = await get('/products?limit=51');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION' } });
  });
});
