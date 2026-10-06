import { describe, expect, it } from 'vitest';
import type { ProductSummary } from '@borneo/shared';
import { AppError } from '../../errors';
import { createCatalogService, encodeCursor, type CatalogDeps } from './catalog.service';

const summary = (slug: string): ProductSummary => ({
  id: slug,
  slug,
  name: slug,
  categorySlug: 'audio',
  tier: 'value',
  status: 'live',
  pricePaise: 100,
  mrpPaise: 100,
});

function setup(slugs: string[]) {
  const calls: Parameters<CatalogDeps['listProducts']>[0][] = [];
  const service = createCatalogService({
    listCategories: async () => [],
    findCategoryIdBySlug: async (slug) => (slug === 'audio' ? 'cat-audio' : undefined),
    listProducts: async (q) => {
      calls.push(q);
      return slugs.map(summary);
    },
  });
  return { service, calls };
}

describe('catalog service', () => {
  it('returns a next cursor only when another page exists', async () => {
    const full = await setup(['a', 'b', 'c']).service.listProducts({ limit: 2 });
    expect(full.items.map((i) => i.slug)).toEqual(['a', 'b']);
    expect(full.nextCursor).toBe(encodeCursor('b'));

    const last = await setup(['a', 'b']).service.listProducts({ limit: 2 });
    expect(last.nextCursor).toBeNull();
  });

  it('resolves the category and decodes the cursor for the repository', async () => {
    const { service, calls } = setup([]);
    await service.listProducts({
      category: 'audio',
      cursor: encodeCursor('echo-buds-1'),
      limit: 5,
    });
    expect(calls).toEqual([{ categoryId: 'cat-audio', afterSlug: 'echo-buds-1', limit: 5 }]);
  });

  it('rejects an unknown category with CATEGORY_NOT_FOUND', async () => {
    await expect(
      setup([]).service.listProducts({ category: 'nope', limit: 5 }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'CATEGORY_NOT_FOUND',
    });
  });

  it('rejects a tampered cursor with INVALID_CURSOR', async () => {
    const err = await setup([])
      .service.listProducts({ cursor: encodeCursor("x' or 1=1"), limit: 5 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ statusCode: 400, code: 'INVALID_CURSOR' });
  });
});
