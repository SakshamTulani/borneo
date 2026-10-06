import { searchResultSchema, type SearchResult } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';

const db = useTestDb();
const app = testApp(db);

async function search(q: string, limit = 24): Promise<SearchResult> {
  const res = await app.inject({
    method: 'GET',
    url: `/search?q=${encodeURIComponent(q)}&limit=${limit}`,
  });
  expect(res.statusCode, q).toBe(200);
  return searchResultSchema.parse(res.json());
}
const slugs = (r: SearchResult) => r.products.map((p) => p.slug);

describe('GET /search', () => {
  it('D-110: an exact model name, model number or SKU names the product to open', async () => {
    expect((await search('Borneo Pulse 4')).exactMatch).toEqual({ slug: 'pulse-4', sku: null });
    expect((await search('pulse 4')).exactMatch).toEqual({ slug: 'pulse-4', sku: null });
    expect((await search('bp4-2025')).exactMatch).toEqual({ slug: 'pulse-4', sku: null });
    expect((await search('BP4-6-128-FOR')).exactMatch).toEqual({
      slug: 'pulse-4',
      sku: 'BP4-6-128-FOR',
    });
  });

  it('D-110: discontinued products still open by exact name but are not listed', async () => {
    const r = await search('pulse 3');
    expect(r.exactMatch).toEqual({ slug: 'pulse-3', sku: null });
    expect(slugs(r)).not.toContain('pulse-3');
  });

  it('D-111: synonyms, including Hinglish, find the right products', async () => {
    expect(slugs(await search('tws'))).toEqual(expect.arrayContaining(['echo-buds-2']));
    expect((await search('jhadu pocha')).interpretation.category?.slug).toBe('robot-vacuums');
    expect(slugs(await search('back cover')).every((s) => s.startsWith('case-'))).toBe(true);
  });

  it('ADR-0002: typos still find the product', async () => {
    expect(slugs(await search('pulze'))[0]).toBe('pulse-4');
    expect(slugs(await search('chargr'))).toEqual(expect.arrayContaining(['charger-33w']));
    expect(slugs(await search('wach'))).toEqual(expect.arrayContaining(['watch-s2']));
  });

  it('D-112: results carry price and stock, plus the categories they belong to', async () => {
    const r = await search('echo', 5);
    expect(r.products.length).toBeGreaterThan(0);
    expect(r.products.length).toBeLessThanOrEqual(5);
    for (const p of r.products) {
      expect(p.price.sellingPaise).toBeGreaterThan(0);
      expect(['inStock', 'outOfStock', 'preorder']).toContain(p.availability);
    }
    expect(r.categories.map((c) => c.slug)).toEqual(['audio']);
  });

  it('D-182: weak typo matches drop out beside strong ones', async () => {
    expect(slugs(await search('phone cover')).every((s) => s.startsWith('case-'))).toBe(true);
  });

  it('D-113: "phone under 30000" lists smartphones at or under ₹30,000', async () => {
    const r = await search('phone under 30000');
    expect(r.interpretation).toEqual({
      text: 'phone',
      maxPricePaise: 3_000_000,
      category: { slug: 'smartphones', name: 'Smartphones' },
    });
    expect(r.exactMatch).toBeNull();
    expect(r.products.length).toBeGreaterThan(0);
    for (const p of r.products) {
      expect(p.categorySlug).toBe('smartphones');
      expect(p.price.sellingPaise).toBeLessThanOrEqual(3_000_000);
    }
  });

  it('D-114: nothing within budget offers the cheapest of that category and categories', async () => {
    const r = await search('phones under 5000');
    expect(r.products).toEqual([]);
    const prices = r.fallback!.alternatives.map((p) => p.price.sellingPaise);
    expect(prices.length).toBeGreaterThan(0);
    expect(r.fallback!.alternatives.every((p) => p.categorySlug === 'smartphones')).toBe(true);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    expect(r.fallback!.categories.length).toBeGreaterThan(0);
  });

  it('D-114: a query that matches nothing gets categories to browse, no product capture', async () => {
    const r = await search('xyzzy');
    expect(r.products).toEqual([]);
    expect(r.fallback).toEqual({ alternatives: [], categories: expect.any(Array) });
    expect(r.fallback!.categories[0]).toEqual({ slug: 'smartphones', name: 'Smartphones' });
  });

  it('rejects an empty or overlong query', async () => {
    for (const q of ['', '   ', 'x'.repeat(101)]) {
      const res = await app.inject({ method: 'GET', url: `/search?q=${q}` });
      expect(res.statusCode, JSON.stringify(q)).toBe(400);
    }
  });
});
