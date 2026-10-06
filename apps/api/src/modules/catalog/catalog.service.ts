import type { CategoryDto, ProductSummary } from '@borneo/shared';
import { AppError, notFound } from '../../errors';
import type { CategoryListResponse, ProductListQuery, ProductListResponse } from './catalog.schema';

export type CatalogDeps = {
  listCategories: () => Promise<CategoryDto[]>;
  findCategoryIdBySlug: (slug: string) => Promise<string | undefined>;
  listProducts: (query: {
    categoryId?: string;
    afterSlug?: string;
    limit: number;
  }) => Promise<ProductSummary[]>;
};

/** Cursors are opaque to clients (base64url of the last slug). */
export const encodeCursor = (slug: string) => Buffer.from(slug, 'utf8').toString('base64url');
function decodeCursor(cursor: string): string {
  const slug = Buffer.from(cursor, 'base64url').toString('utf8');
  if (!/^[a-z0-9-]+$/.test(slug)) throw new AppError(400, 'INVALID_CURSOR', 'Cursor is invalid');
  return slug;
}

export function createCatalogService(deps: CatalogDeps) {
  return {
    async listCategories(): Promise<CategoryListResponse> {
      return { items: await deps.listCategories() };
    },

    async listProducts(query: ProductListQuery): Promise<ProductListResponse> {
      let categoryId: string | undefined;
      if (query.category !== undefined) {
        categoryId = await deps.findCategoryIdBySlug(query.category);
        if (!categoryId) throw notFound('CATEGORY_NOT_FOUND', `No category "${query.category}"`);
      }
      const rows = await deps.listProducts({
        limit: query.limit,
        ...(categoryId ? { categoryId } : {}),
        ...(query.cursor ? { afterSlug: decodeCursor(query.cursor) } : {}),
      });
      const items = rows.slice(0, query.limit);
      const last = items.at(-1);
      return {
        items,
        nextCursor: rows.length > query.limit && last ? encodeCursor(last.slug) : null,
      };
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
