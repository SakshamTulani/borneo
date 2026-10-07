import { productListResponseSchema, searchResultSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';

const db = useTestDb();
const app = testApp(db);
const get = async (url: string) => app.inject({ method: 'GET', url });

describe('search pages', () => {
  it('D-182: pages through every relevant match once, with the total', async () => {
    const first = searchResultSchema.parse((await get('/search?q=borneo&limit=5')).json());
    expect(first.products).toHaveLength(5);
    expect(first.total).toBeGreaterThan(5);
    const seen = [...first.products.map((p) => p.slug)];
    let cursor = first.nextCursor;
    while (cursor) {
      const page = searchResultSchema.parse(
        (await get(`/search?q=borneo&limit=5&cursor=${cursor}`)).json(),
      );
      seen.push(...page.products.map((p) => p.slug));
      cursor = page.nextCursor;
    }
    expect(seen).toHaveLength(first.total);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('refuses a cursor that is not ours', async () => {
    expect((await get('/search?q=borneo&cursor=abc')).statusCode).toBe(400);
  });
});

describe('listing totals', () => {
  it('D-19: every page carries how many match across all pages', async () => {
    const first = productListResponseSchema.parse(
      (await get('/products?category=smartphones&limit=3')).json(),
    );
    expect(first.items).toHaveLength(3);
    expect(first.total).toBeGreaterThan(3);
    const next = productListResponseSchema.parse(
      (await get(`/products?category=smartphones&limit=3&cursor=${first.nextCursor}`)).json(),
    );
    expect(next.total).toBe(first.total);
    const filtered = productListResponseSchema.parse(
      (await get('/products?category=smartphones&limit=3&nfc=true')).json(),
    );
    expect(filtered.total).toBeLessThanOrEqual(first.total);
  });
});
