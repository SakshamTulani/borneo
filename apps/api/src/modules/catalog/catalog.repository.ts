import { and, asc, desc, eq, gt, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import {
  attributeDefSchema,
  bundleKey,
  itemKey,
  type AttributeDef,
  type BundleFacts,
  type ItemFacts,
  type ReturnPolicy,
  type Attributes,
  type CategoryDto,
  type FlashSale,
  type ListingFilter,
  type ProductImage,
  type ProductSort,
  type ProductStatus,
  type RelationEdge,
} from '@borneo/shared';
import type { Db } from '../../db/client';
import {
  attributeDef,
  bundle,
  bundleItem,
  category,
  faq,
  flashSale,
  inventory,
  media,
  product,
  productLine,
  relation,
  review,
  variant,
} from '../../db/schema/index';

/** Discontinued products leave listings but keep their PDP and relations (D-17). */
const LISTED = ['live', 'preorder'] as const;

const categoryColumns = {
  id: category.id,
  slug: category.slug,
  name: category.name,
  parentId: category.parentId,
  depth: category.depth,
  returnPolicy: category.returnPolicy,
  config: category.config,
};

export async function listCategories(db: Db): Promise<CategoryDto[]> {
  return db.select(categoryColumns).from(category).orderBy(asc(category.sort), asc(category.slug));
}

export type CategoryWithDefs = { category: CategoryDto; defs: AttributeDef[] };

export async function listAttributeDefs(db: Db, categoryId: string): Promise<AttributeDef[]> {
  const rows = await db
    .select()
    .from(attributeDef)
    .where(eq(attributeDef.categoryId, categoryId))
    .orderBy(asc(attributeDef.sort));
  return rows.map((d) =>
    attributeDefSchema.parse({
      key: d.key,
      label: d.label,
      type: d.type,
      ...(d.unit ? { unit: d.unit } : {}),
      ...(d.options ? { options: d.options } : {}),
      ...(d.optionLabels ? { optionLabels: d.optionLabels } : {}),
      filterable: d.filterable,
      comparable: d.comparable,
      compat: d.compat,
    }),
  );
}

export async function findCategoryBySlug(
  db: Db,
  slug: string,
): Promise<CategoryWithDefs | undefined> {
  const [row] = await db.select(categoryColumns).from(category).where(eq(category.slug, slug));
  return row ? { category: row, defs: await listAttributeDefs(db, row.id) } : undefined;
}

/** Each product's lowest regular variant price: what sorting and the price filter use (D-18, D-19). */
export function cheapestVariant(db: Db) {
  return db
    .selectDistinctOn([variant.productId], {
      productId: variant.productId,
      pricePaise: variant.pricePaise,
    })
    .from(variant)
    .orderBy(variant.productId, asc(variant.pricePaise), asc(variant.sku))
    .as('cheapest');
}

/** SQL for one category filter (D-18). Values were validated against the category's definitions. */
function filterCondition(f: ListingFilter): SQL {
  const attrs = product.attributes;
  const values = (vs: string[]) =>
    sql.join(
      vs.map((v) => sql`${v}`),
      sql`, `,
    );
  // Parenthesised: drizzle's and() does not wrap its operands.
  switch (f.kind) {
    case 'anyOf':
      // Enum: the value is one of them. List: it contains any of them.
      return sql`((jsonb_typeof(${attrs} -> ${f.key}) = 'string' and ${attrs} ->> ${f.key} in (${values(f.values)})) or (jsonb_typeof(${attrs} -> ${f.key}) = 'array' and ${attrs} -> ${f.key} ?| array[${values(f.values)}]::text[]))`;
    case 'isTrue':
      return sql`(${attrs} -> ${f.key} = 'true'::jsonb)`;
    case 'atLeast':
      return sql`((case when jsonb_typeof(${attrs} -> ${f.key}) = 'number' then (${attrs} ->> ${f.key})::numeric end) >= ${f.value})`;
  }
}

export type ListingRow = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  categorySlug: string;
  lineName: string;
  tier: 'value' | 'upper_mid' | 'premium';
  status: ProductStatus;
  /** Sort key: lowest regular variant price. */
  pricePaise: number;
  /** Sort key: launch date (YYYY-MM-DD), '0000-01-01' when unknown. */
  launched: string;
};

export type ListingQuery = {
  categoryId?: string;
  filters: ListingFilter[];
  maxPricePaise?: number;
  sort: ProductSort;
  /** Keyset: the last row of the previous page. */
  after?: { key: string | number; slug: string };
  limit: number;
};

const UNKNOWN_LAUNCH = '0000-01-01';

/**
 * One page of listed products (live or pre-order), filtered and sorted (D-17–19). Returns up to
 * `limit + 1` rows so the caller can tell whether another page exists. Products without a
 * variant are not listed. Slug breaks ties, so keyset paging never skips or repeats.
 */
export async function listProducts(db: Db, q: ListingQuery): Promise<ListingRow[]> {
  const cheapest = cheapestVariant(db);
  const launched = sql<string>`coalesce(${product.launchedAt}::text, ${UNKNOWN_LAUNCH})`;
  const key = q.sort === 'newest' ? launched : sql`${cheapest.pricePaise}`;
  const keyDir = q.sort === 'price_asc' ? gt : (a: SQL, b: unknown) => sql`${a} < ${b}`;
  const after = q.after
    ? or(
        keyDir(key, q.after.key),
        and(sql`${key} = ${q.after.key}`, gt(product.slug, q.after.slug)),
      )
    : undefined;

  return db
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      categoryId: product.categoryId,
      categorySlug: category.slug,
      lineName: productLine.name,
      tier: product.tier,
      status: product.status,
      pricePaise: cheapest.pricePaise,
      launched,
    })
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .innerJoin(productLine, eq(productLine.id, product.lineId))
    .innerJoin(cheapest, eq(cheapest.productId, product.id))
    .where(
      and(
        inArray(product.status, [...LISTED]),
        q.categoryId ? eq(product.categoryId, q.categoryId) : undefined,
        q.maxPricePaise !== undefined ? lte(cheapest.pricePaise, q.maxPricePaise) : undefined,
        ...q.filters.map(filterCondition),
        after,
      ),
    )
    .orderBy(q.sort === 'price_asc' ? asc(key) : desc(key), asc(product.slug))
    .limit(q.limit + 1);
}

/** Listing rows for given products (suggestions), listed ones only (D-17). */
export async function listProductsByIds(db: Db, ids: string[]): Promise<ListingRow[]> {
  if (ids.length === 0) return [];
  const cheapest = cheapestVariant(db);
  return db
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      categoryId: product.categoryId,
      categorySlug: category.slug,
      lineName: productLine.name,
      tier: product.tier,
      status: product.status,
      pricePaise: cheapest.pricePaise,
      launched: sql<string>`coalesce(${product.launchedAt}::text, ${UNKNOWN_LAUNCH})`,
    })
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .innerJoin(productLine, eq(productLine.id, product.lineId))
    .innerJoin(cheapest, eq(cheapest.productId, product.id))
    .where(and(inArray(product.id, ids), inArray(product.status, [...LISTED])));
}

/** Attributes and lowest regular price of every listed product in a category, for facets (D-18). */
export async function listedProductFacts(
  db: Db,
  categoryId: string,
): Promise<{ attributes: Attributes; pricePaise: number }[]> {
  const cheapest = cheapestVariant(db);
  return db
    .select({ attributes: product.attributes, pricePaise: cheapest.pricePaise })
    .from(product)
    .innerJoin(cheapest, eq(cheapest.productId, product.id))
    .where(and(eq(product.categoryId, categoryId), inArray(product.status, [...LISTED])));
}

export type VariantState = {
  id: string;
  productId: string;
  sku: string;
  options: Record<string, string>;
  pricePaise: number;
  mrpPaise: number;
  preorderCap: number | null;
  preorderSold: number;
  /** Unreserved units across all warehouses. */
  unitsAvailable: number;
  /** Flash sales that have not ended; the rule decides which is live (D-140). */
  flashSales: FlashSale[];
};

export async function loadVariantStates(
  db: Db,
  productIds: string[],
  now: Date,
): Promise<VariantState[]> {
  if (productIds.length === 0) return [];
  const stock = db
    .select({
      variantId: inventory.variantId,
      units: sql<number>`sum(${inventory.onHand} - ${inventory.reserved})::int`.as('units'),
    })
    .from(inventory)
    .groupBy(inventory.variantId)
    .as('stock');
  const [variants, sales] = await Promise.all([
    db
      .select({
        id: variant.id,
        productId: variant.productId,
        sku: variant.sku,
        options: variant.options,
        pricePaise: variant.pricePaise,
        mrpPaise: variant.mrpPaise,
        preorderCap: variant.preorderCap,
        preorderSold: variant.preorderSold,
        units: stock.units,
      })
      .from(variant)
      .leftJoin(stock, eq(stock.variantId, variant.id))
      .where(inArray(variant.productId, productIds))
      .orderBy(asc(variant.pricePaise), asc(variant.sku)),
    db
      .select()
      .from(flashSale)
      .innerJoin(variant, eq(variant.id, flashSale.variantId))
      .where(and(inArray(variant.productId, productIds), gt(flashSale.endsAt, now))),
  ]);
  return variants.map(({ units, ...v }) => ({
    ...v,
    unitsAvailable: units ?? 0,
    flashSales: sales
      .filter((s) => s.flash_sale.variantId === v.id)
      .map(({ flash_sale: s }) => ({
        id: s.id,
        variantId: s.variantId,
        salePricePaise: s.salePricePaise,
        startsAt: s.startsAt.getTime(),
        endsAt: s.endsAt.getTime(),
        cap: s.cap,
        sold: s.sold,
        perCustomerLimit: 1 as const,
      })),
  }));
}

/** Product photos in display order, lead first (D-180). */
export async function loadImages(
  db: Db,
  productIds: string[],
): Promise<Map<string, ProductImage[]>> {
  const images = new Map<string, ProductImage[]>();
  if (productIds.length === 0) return images;
  const rows = await db
    .select({ productId: media.productId, src: media.url, alt: media.alt })
    .from(media)
    .where(and(inArray(media.productId, productIds), eq(media.kind, 'image')))
    .orderBy(asc(media.productId), asc(media.sort));
  for (const { productId, ...image } of rows)
    images.set(productId, [...(images.get(productId) ?? []), image]);
  return images;
}

/** Verified reviews only (D-150): every review row is tied to a delivered order item. */
export async function loadRatings(
  db: Db,
  productIds: string[],
): Promise<Map<string, { average: number; count: number }>> {
  if (productIds.length === 0) return new Map();
  const rows = await db
    .select({
      productId: review.productId,
      average: sql<number>`avg(${review.rating})::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(review)
    .where(inArray(review.productId, productIds))
    .groupBy(review.productId);
  return new Map(rows.map((r) => [r.productId, { average: r.average, count: r.count }]));
}

export type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  createdAt: Date;
};

/**
 * Verified reviews of a product, newest first (D-150); `after` is the last row of the previous
 * page. Returns up to `limit + 1` rows so the caller can tell whether another page exists.
 */
export async function loadReviews(
  db: Db,
  productId: string,
  page: { limit: number; after?: { createdAt: Date; id: string } },
): Promise<ReviewRow[]> {
  const after = page.after
    ? or(
        sql`${review.createdAt} < ${page.after.createdAt}`,
        and(eq(review.createdAt, page.after.createdAt), sql`${review.id} < ${page.after.id}`),
      )
    : undefined;
  return db
    .select({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      authorName: review.authorName,
      createdAt: review.createdAt,
    })
    .from(review)
    .where(and(eq(review.productId, productId), after))
    .orderBy(desc(review.createdAt), desc(review.id))
    .limit(page.limit + 1);
}

/** How many verified reviews a product has at each rating. */
export async function loadRatingCounts(
  db: Db,
  productId: string,
): Promise<{ rating: number; count: number }[]> {
  return db
    .select({ rating: review.rating, count: sql<number>`count(*)::int` })
    .from(review)
    .where(eq(review.productId, productId))
    .groupBy(review.rating);
}

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  modelNumber: string;
  lineName: string;
  tier: 'value' | 'upper_mid' | 'premium';
  status: ProductStatus;
  attributes: Attributes;
  explainer: string | null;
  whoFor: string | null;
  notFor: string | null;
  dispatchFrom: string | null;
  dispatchTo: string | null;
  category: CategoryDto;
};

/** A product page: any status but draft, so discontinued products keep their PDP (D-17). */
export async function findProductBySlug(db: Db, slug: string): Promise<ProductRow | undefined> {
  const [row] = await db
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      modelNumber: product.modelNumber,
      lineName: productLine.name,
      tier: product.tier,
      status: product.status,
      attributes: product.attributes,
      explainer: product.explainer,
      whoFor: product.whoFor,
      notFor: product.notFor,
      dispatchFrom: product.dispatchFrom,
      dispatchTo: product.dispatchTo,
      category: categoryColumns,
    })
    .from(product)
    .innerJoin(category, eq(category.id, product.categoryId))
    .innerJoin(productLine, eq(productLine.id, product.lineId))
    .where(and(eq(product.slug, slug), ne(product.status, 'draft')));
  return row;
}

/** Product FAQs first, then the category's (D-152). */
export async function loadFaqs(
  db: Db,
  productId: string,
  categoryId: string,
): Promise<{ question: string; answer: string }[]> {
  const rows = await db
    .select({ question: faq.question, answer: faq.answer, productId: faq.productId })
    .from(faq)
    .where(or(eq(faq.productId, productId), eq(faq.categoryId, categoryId)))
    .orderBy(asc(faq.sort));
  return [...rows.filter((r) => r.productId), ...rows.filter((r) => !r.productId)].map(
    ({ question, answer }) => ({ question, answer }),
  );
}

/** The SKU of each product that has exactly one variant (it can be added without a choice). */
export async function soleVariantSkus(db: Db, productIds: string[]): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();
  const rows = await db
    .select({ productId: variant.productId, sku: sql<string>`min(${variant.sku})` })
    .from(variant)
    .where(inArray(variant.productId, productIds))
    .groupBy(variant.productId)
    .having(sql`count(*) = 1`);
  return new Map(rows.map((r) => [r.productId, r.sku]));
}

/** Materialised edges from several products (cart cross-sell, D-199). */
export async function loadRelationsFromMany(db: Db, productIds: string[]): Promise<RelationEdge[]> {
  if (productIds.length === 0) return [];
  return db
    .select({
      fromProductId: relation.fromProductId,
      toProductId: relation.toProductId,
      type: relation.type,
      source: relation.source,
      reason: relation.reason,
    })
    .from(relation)
    .where(inArray(relation.fromProductId, productIds));
}

/** Materialised edges from a product (D-20, D-21). */
export async function loadRelationsFrom(db: Db, productId: string): Promise<RelationEdge[]> {
  return db
    .select({
      fromProductId: relation.fromProductId,
      toProductId: relation.toProductId,
      type: relation.type,
      source: relation.source,
      reason: relation.reason,
    })
    .from(relation)
    .where(eq(relation.fromProductId, productId));
}

// Cart facts (D-193–D-198): variants and bundles as the cart rules see them.

/** Display facts for one variant in a cart or bundle. */
export type CartProductRow = {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  options: Record<string, string>;
  image: ProductImage | null;
  returnPolicy: ReturnPolicy;
};

export type ItemRow = { key: string; facts: ItemFacts; product: CartProductRow };
export type BundleRow = {
  key: string;
  slug: string;
  name: string;
  facts: BundleFacts;
  members: (CartProductRow & { qty: number })[];
};

/** Every state a variant can be in (also discontinued and draft: the cart says so, D-198). */
async function loadVariants(db: Db, where: { skus?: string[]; ids?: string[] }, now: Date) {
  const filter = where.skus ? inArray(variant.sku, where.skus) : inArray(variant.id, where.ids!);
  const stock = db
    .select({
      variantId: inventory.variantId,
      units: sql<number>`sum(${inventory.onHand} - ${inventory.reserved})::int`.as('units'),
    })
    .from(inventory)
    .groupBy(inventory.variantId)
    .as('stock');
  const rows = await db
    .select({
      id: variant.id,
      sku: variant.sku,
      options: variant.options,
      pricePaise: variant.pricePaise,
      preorderCap: variant.preorderCap,
      preorderSold: variant.preorderSold,
      units: stock.units,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      categoryId: product.categoryId,
      returnPolicy: category.returnPolicy,
    })
    .from(variant)
    .innerJoin(product, eq(product.id, variant.productId))
    .innerJoin(category, eq(category.id, product.categoryId))
    .leftJoin(stock, eq(stock.variantId, variant.id))
    .where(filter);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const productIds = [...new Set(rows.map((r) => r.productId))];
  const [sales, images] = await Promise.all([
    db
      .select()
      .from(flashSale)
      .where(and(inArray(flashSale.variantId, ids), gt(flashSale.endsAt, now))),
    db
      .selectDistinctOn([media.productId], {
        productId: media.productId,
        src: media.url,
        alt: media.alt,
      })
      .from(media)
      .where(and(inArray(media.productId, productIds), eq(media.kind, 'image')))
      .orderBy(media.productId, asc(media.sort)),
  ]);
  const imageOf = new Map(images.map(({ productId, ...image }) => [productId, image]));
  return rows.map((r) => ({
    ...r,
    unitsAvailable: r.units ?? 0,
    image: imageOf.get(r.productId) ?? null,
    flashSales: sales
      .filter((s) => s.variantId === r.id)
      .map((s): FlashSale => ({
        id: s.id,
        variantId: s.variantId,
        salePricePaise: s.salePricePaise,
        startsAt: s.startsAt.getTime(),
        endsAt: s.endsAt.getTime(),
        cap: s.cap,
        sold: s.sold,
        perCustomerLimit: 1,
      })),
  }));
}

type VariantRow = Awaited<ReturnType<typeof loadVariants>>[number];

const productRow = (v: VariantRow): CartProductRow => ({
  productId: v.productId,
  name: v.name,
  slug: v.slug,
  sku: v.sku,
  options: v.options,
  image: v.image,
  returnPolicy: v.returnPolicy,
});

/** Cart facts for variants by SKU; unknown SKUs are left out. */
export async function loadCartItems(db: Db, skus: string[], now: Date): Promise<ItemRow[]> {
  if (skus.length === 0) return [];
  return (await loadVariants(db, { skus }, now)).map((v) => ({
    key: itemKey(v.sku),
    product: productRow(v),
    facts: {
      kind: 'item',
      productId: v.productId,
      categoryId: v.categoryId,
      status: v.status,
      regularPaise: v.pricePaise,
      unitsAvailable: v.unitsAvailable,
      preorderCap: v.preorderCap,
      preorderSold: v.preorderSold,
      flashSales: v.flashSales,
    },
  }));
}

/** Bundles by slug, or every bundle a product is in (D-197). Unknown slugs are left out. */
export async function loadCartBundles(
  db: Db,
  where: { slugs: string[] } | { productId: string },
  now: Date,
): Promise<BundleRow[]> {
  const filter =
    'slugs' in where
      ? where.slugs.length
        ? inArray(bundle.slug, where.slugs)
        : undefined
      : inArray(
          bundle.id,
          db
            .select({ id: bundleItem.bundleId })
            .from(bundleItem)
            .innerJoin(variant, eq(variant.id, bundleItem.variantId))
            .where(eq(variant.productId, where.productId)),
        );
  if (!filter) return [];
  const bundles = await db.select().from(bundle).where(filter).orderBy(asc(bundle.slug));
  if (bundles.length === 0) return [];
  const items = await db
    .select()
    .from(bundleItem)
    .where(
      inArray(
        bundleItem.bundleId,
        bundles.map((b) => b.id),
      ),
    );
  const variants = new Map(
    (await loadVariants(db, { ids: [...new Set(items.map((i) => i.variantId))] }, now)).map((v) => [
      v.id,
      v,
    ]),
  );
  return bundles.map((b) => {
    const members = items
      .filter((i) => i.bundleId === b.id)
      .map((i) => ({ variant: variants.get(i.variantId)!, qty: i.qty }))
      .sort((x, y) => y.variant.pricePaise - x.variant.pricePaise);
    return {
      key: bundleKey(b.slug),
      slug: b.slug,
      name: b.name,
      facts: {
        kind: 'bundle',
        pricePaise: b.pricePaise,
        activeFrom: b.activeFrom.getTime(),
        activeTo: b.activeTo?.getTime() ?? null,
        members: members.map(({ variant: v, qty }) => ({
          productId: v.productId,
          categoryId: v.categoryId,
          status: v.status,
          regularPaise: v.pricePaise,
          unitsAvailable: v.unitsAvailable,
          qty,
        })),
      },
      members: members.map(({ variant: v, qty }) => ({ ...productRow(v), qty })),
    };
  });
}
