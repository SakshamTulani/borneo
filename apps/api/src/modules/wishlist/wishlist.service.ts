import {
  canAddToWishlist,
  type CustomerId,
  type ProductStatus,
  type ProductSummary,
  type WishlistPage,
} from '@borneo/shared';
import { readTimeCursor, timeCursor } from '../../cursor';
import { AppError, notFound } from '../../errors';

export type WishlistDeps<Row extends { id: string } = { id: string }> = {
  now: () => number;
  findTarget: (
    customerId: CustomerId,
    slug: string,
  ) => Promise<{ id: string; status: ProductStatus; saved: boolean; count: number } | undefined>;
  /** False when the cap was reached meanwhile (checked in the insert itself). */
  add: (customerId: CustomerId, productId: string, now: number) => Promise<boolean>;
  remove: (customerId: CustomerId, productId: string) => Promise<void>;
  list: (
    customerId: CustomerId,
    page: { limit: number; after?: { at: Date; id: string } },
  ) => Promise<{ rows: { productId: string; createdAt: Date }[]; total: number }>;
  slugs: (customerId: CustomerId) => Promise<string[]>;
  /** Catalog rows for products in any status but draft, priced like listings. */
  loadRows: (ids: string[]) => Promise<Row[]>;
  summarize: (rows: Row[]) => Promise<ProductSummary[]>;
};

/** Wishlist (D-235): save any product that is sold; listed newest first, priced as now. */
export function createWishlistService<Row extends { id: string }>(deps: WishlistDeps<Row>) {
  return {
    async list(
      customerId: CustomerId,
      query: { cursor?: string | undefined; limit: number },
    ): Promise<WishlistPage> {
      const { rows, total } = await deps.list(customerId, {
        limit: query.limit,
        ...(query.cursor ? { after: readTimeCursor(query.cursor) } : {}),
      });
      const page = rows.slice(0, query.limit);
      const cards = new Map(
        (await deps.summarize(await deps.loadRows(page.map((r) => r.productId)))).map((c) => [
          c.id,
          c,
        ]),
      );
      const last = page.at(-1);
      return {
        items: page.flatMap((r) => {
          const product = cards.get(r.productId);
          return product ? [{ product, addedAt: r.createdAt.getTime() }] : [];
        }),
        total,
        nextCursor:
          rows.length > query.limit && last ? timeCursor(last.createdAt, last.productId) : null,
      };
    },

    async slugs(customerId: CustomerId) {
      return { slugs: await deps.slugs(customerId) };
    },

    async add(customerId: CustomerId, slug: string) {
      const target = await deps.findTarget(customerId, slug);
      if (!target || target.status === 'draft')
        throw notFound('PRODUCT_NOT_FOUND', "We couldn't find that product.");
      const check = canAddToWishlist({
        status: target.status,
        count: target.count,
        alreadySaved: target.saved,
      });
      if (!check.ok)
        throw new AppError(
          422,
          check.reason,
          check.reason === 'NOT_SOLD'
            ? 'This product is no longer sold.'
            : 'Your wishlist is full (200). Remove something first.',
        );
      if (!target.saved && !(await deps.add(customerId, target.id, deps.now())))
        throw new AppError(
          422,
          'WISHLIST_FULL',
          'Your wishlist is full (200). Remove something first.',
        );
      return { slugs: await deps.slugs(customerId) };
    },

    async remove(customerId: CustomerId, slug: string) {
      const target = await deps.findTarget(customerId, slug);
      if (target) await deps.remove(customerId, target.id);
      return { slugs: await deps.slugs(customerId) };
    },
  };
}

export type WishlistService = ReturnType<typeof createWishlistService<{ id: string }>>;
