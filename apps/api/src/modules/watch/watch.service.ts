import {
  canWatch,
  variantAvailability,
  WATCH_MAX,
  type CustomerId,
  type ProductImage,
  type ProductStatus,
  type WatchList,
} from '@borneo/shared';
import { AppError, notFound } from '../../errors';

type VariantFacts = {
  variantId: string;
  sku: string;
  options: Record<string, string>;
  pricePaise: number;
  preorderCap: number | null;
  preorderSold: number;
  productId: string;
  slug: string;
  name: string;
  status: ProductStatus;
  unitsAvailable: number;
};

export type WatchDeps = {
  now: () => number;
  findTarget: (
    customerId: CustomerId,
    sku: string,
  ) => Promise<(VariantFacts & { watching: boolean }) | undefined>;
  list: (customerId: CustomerId) => Promise<(VariantFacts & { createdAt: Date })[]>;
  count: (customerId: CustomerId) => Promise<number>;
  add: (customerId: CustomerId, variantId: string, now: number) => Promise<void>;
  remove: (customerId: CustomerId, variantId: string) => Promise<void>;
  loadImages: (productIds: string[]) => Promise<Map<string, ProductImage[]>>;
};

const SOLD = new Set<ProductStatus>(['live', 'preorder']);

/** Watch (D-147, D-222): on-site only, for variants that are out of stock when added. */
export function createWatchService(deps: WatchDeps) {
  async function list(customerId: CustomerId): Promise<WatchList> {
    const rows = await deps.list(customerId);
    const images = await deps.loadImages([...new Set(rows.map((r) => r.productId))]);
    return {
      items: rows.map((r) => ({
        sku: r.sku,
        slug: r.slug,
        name: r.name,
        options: r.options,
        image: images.get(r.productId)?.[0] ?? null,
        pricePaise: r.pricePaise,
        availability: SOLD.has(r.status) ? variantAvailability(r) : 'unavailable',
        createdAt: r.createdAt.getTime(),
      })),
    };
  }

  return {
    list,

    async add(customerId: CustomerId, sku: string): Promise<WatchList> {
      const target = await deps.findTarget(customerId, sku);
      if (!target || !SOLD.has(target.status))
        throw notFound('PRODUCT_NOT_FOUND', "We couldn't find that product.");
      if (!target.watching) {
        if (!canWatch(variantAvailability(target)))
          throw new AppError(422, 'IN_STOCK', 'This is in stock: you can buy it now.');
        if ((await deps.count(customerId)) >= WATCH_MAX)
          throw new AppError(
            422,
            'WATCH_LIMIT',
            `You can watch up to ${WATCH_MAX} items. Remove one first.`,
          );
        await deps.add(customerId, target.variantId, deps.now());
      }
      return list(customerId);
    },

    async remove(customerId: CustomerId, sku: string): Promise<WatchList> {
      const target = await deps.findTarget(customerId, sku);
      if (target) await deps.remove(customerId, target.variantId);
      return list(customerId);
    },
  };
}

export type WatchService = ReturnType<typeof createWatchService>;
