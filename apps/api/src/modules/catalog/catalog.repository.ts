import { and, asc, eq, gt, inArray } from 'drizzle-orm';
import type { CategoryDto, ProductSummary } from '@borneo/shared';
import type { Db } from '../../db/client';
import { category, product, variant } from '../../db/schema/index';

/** Discontinued products leave listings but keep their PDP and relations (D-17). */
const LISTED = ['live', 'preorder'] as const;

export async function listCategories(db: Db): Promise<CategoryDto[]> {
  return db
    .select({
      id: category.id,
      slug: category.slug,
      name: category.name,
      parentId: category.parentId,
      depth: category.depth,
      returnPolicy: category.returnPolicy,
      config: category.config,
    })
    .from(category)
    .orderBy(asc(category.sort), asc(category.slug));
}

export async function findCategoryIdBySlug(db: Db, slug: string): Promise<string | undefined> {
  const [row] = await db.select({ id: category.id }).from(category).where(eq(category.slug, slug));
  return row?.id;
}

/**
 * One page of listed products ordered by slug (keyset on slug). Returns up to `limit + 1` rows so
 * the caller can tell whether another page exists. Price is the cheapest variant's, with its MRP;
 * products without a variant are not listed.
 */
export async function listProducts(
  db: Db,
  query: { categoryId?: string; afterSlug?: string; limit: number },
): Promise<ProductSummary[]> {
  const cheapest = db
    .selectDistinctOn([variant.productId], {
      productId: variant.productId,
      pricePaise: variant.pricePaise,
      mrpPaise: variant.mrpPaise,
    })
    .from(variant)
    .orderBy(variant.productId, asc(variant.pricePaise), asc(variant.sku))
    .as('cheapest');

  return db
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      categorySlug: category.slug,
      tier: product.tier,
      status: product.status,
      pricePaise: cheapest.pricePaise,
      mrpPaise: cheapest.mrpPaise,
    })
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .innerJoin(cheapest, eq(cheapest.productId, product.id))
    .where(
      and(
        inArray(product.status, [...LISTED]),
        query.categoryId ? eq(product.categoryId, query.categoryId) : undefined,
        query.afterSlug ? gt(product.slug, query.afterSlug) : undefined,
      ),
    )
    .orderBy(asc(product.slug))
    .limit(query.limit + 1);
}
