import { z } from 'zod';
import {
  cardVariant,
  compatibilityFacts,
  filterFacets,
  flashState,
  lowStockCount,
  parseListingFilters,
  pickSuggestions,
  priceCaps,
  policySummary,
  priceDisplay,
  productAvailability,
  productOffers,
  specGroups,
  variantAvailability,
  type CategoryDetail,
  type CategoryDto,
  type FlashSale,
  type ListingFilter,
  type ProductDetail,
  type ProductImage,
  type ProductSort,
  type ProductSummary,
  type ProductVariant,
  type RelationEdge,
} from '@borneo/shared';
import { AppError, notFound } from '../../errors';
import type { OfferBook } from '../offers/index';
import type {
  CategoryWithDefs,
  ListingQuery,
  ListingRow,
  ProductRow,
  VariantState,
} from './catalog.repository';
import type { CategoryListResponse, ProductListQuery, ProductListResponse } from './catalog.schema';

export type CatalogDeps = {
  now: () => number;
  listCategories: () => Promise<CategoryDto[]>;
  findCategoryBySlug: (slug: string) => Promise<CategoryWithDefs | undefined>;
  listProducts: (query: ListingQuery) => Promise<ListingRow[]>;
  listProductsByIds: (ids: string[]) => Promise<ListingRow[]>;
  listedProductFacts: (
    categoryId: string,
  ) => Promise<{ attributes: Record<string, unknown>; pricePaise: number }[]>;
  loadVariantStates: (productIds: string[], now: number) => Promise<VariantState[]>;
  loadRatings: (productIds: string[]) => Promise<Map<string, { average: number; count: number }>>;
  loadImages: (productIds: string[]) => Promise<Map<string, ProductImage[]>>;
  loadOfferBook: (now: number) => Promise<OfferBook>;
  findProductBySlug: (slug: string) => Promise<ProductRow | undefined>;
  listAttributeDefs: (categoryId: string) => Promise<CategoryWithDefs['defs']>;
  loadFaqs: (
    productId: string,
    categoryId: string,
  ) => Promise<{ question: string; answer: string }[]>;
  loadRelationsFrom: (productId: string) => Promise<RelationEdge[]>;
};

const cursorSchema = z.tuple([z.union([z.string(), z.number()]), z.string().regex(/^[a-z0-9-]+$/)]);

/** Cursors are opaque to clients: base64url JSON of the last row's sort key and slug. */
export const encodeCursor = (key: string | number, slug: string) =>
  Buffer.from(JSON.stringify([key, slug]), 'utf8').toString('base64url');

function decodeCursor(cursor: string, sort: ProductSort): { key: string | number; slug: string } {
  const invalid = new AppError(400, 'INVALID_CURSOR', 'Cursor is invalid');
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw invalid;
  }
  const result = cursorSchema.safeParse(parsed);
  if (!result.success) throw invalid;
  const [key, slug] = result.data;
  const keyOk =
    sort === 'newest'
      ? typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key)
      : Number.isSafeInteger(key);
  if (!keyOk) throw invalid;
  return { key, slug };
}

const sortKey = (row: ListingRow, sort: ProductSort) =>
  sort === 'newest' ? row.launched : row.pricePaise;

/** One rating summary per product: null average until the first verified review (D-150). */
const ratingOf = (ratings: Map<string, { average: number; count: number }>, id: string) => {
  const r = ratings.get(id);
  return r
    ? { average: Math.round(r.average * 10) / 10, count: r.count }
    : { average: null, count: 0 };
};

export function createCatalogService(deps: CatalogDeps) {
  /** Price, availability and flash state per variant, from the shared rules (D-30–33, D-65, D-140). */
  function priceVariant(
    v: VariantState,
    status: ListingRow['status'],
    categoryId: string,
    book: OfferBook,
    now: number,
  ) {
    const live = v.flashSales.find((s: FlashSale) => flashState(s, now) === 'live');
    const price = priceDisplay({
      regularPaise: v.pricePaise,
      mrpPaise: v.mrpPaise,
      categoryId,
      ...(live ? { flashSale: live } : {}),
      paymentOffers: book.paymentOffers,
      emiPlans: book.emiPlans,
      now,
    });
    const low = live ? lowStockCount(live, now) : undefined;
    return {
      availability: variantAvailability({ status, ...v }),
      price,
      sellingPaise: price.sellingPaise,
      flash: live
        ? { endsAt: live.endsAt, ...(low !== undefined ? { lowStockCount: low } : {}) }
        : null,
    };
  }

  async function summarize(rows: ListingRow[]): Promise<ProductSummary[]> {
    const now = deps.now();
    const ids = rows.map((r) => r.id);
    const [variants, ratings, book, images] = await Promise.all([
      deps.loadVariantStates(ids, now),
      deps.loadRatings(ids),
      deps.loadOfferBook(now),
      deps.loadImages(ids),
    ]);
    return rows.flatMap((row) => {
      const priced = variants
        .filter((v) => v.productId === row.id)
        .map((v) => priceVariant(v, row.status, row.categoryId, book, now));
      const card = cardVariant(priced);
      if (!card) return [];
      return [
        {
          id: row.id,
          slug: row.slug,
          name: row.name,
          categorySlug: row.categorySlug,
          lineName: row.lineName,
          tier: row.tier,
          status: row.status,
          availability: productAvailability(priced.map((p) => p.availability)),
          price: card.price,
          // Badge only the variant the card prices: no flash badge next to a regular price (D-140).
          flash: card.flash,
          rating: ratingOf(ratings, row.id),
          image: images.get(row.id)?.[0] ?? null,
        },
      ];
    });
  }

  async function categoryOrThrow(slug: string): Promise<CategoryWithDefs> {
    const found = await deps.findCategoryBySlug(slug);
    if (!found) throw notFound('CATEGORY_NOT_FOUND', `No category "${slug}"`);
    return found;
  }

  return {
    async listCategories(): Promise<CategoryListResponse> {
      return { items: await deps.listCategories() };
    },

    async getCategory(slug: string): Promise<CategoryDetail> {
      const { category, defs } = await categoryOrThrow(slug);
      const facts = await deps.listedProductFacts(category.id);
      const prices = facts.map((f) => f.pricePaise);
      const range = prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
      return {
        category,
        filters: filterFacets(
          category.config,
          defs,
          facts.map((f) => f.attributes),
        ),
        priceRangePaise: range,
        priceCapsPaise: priceCaps(range),
      };
    },

    async listProducts(query: ProductListQuery): Promise<ProductListResponse> {
      const { category: slug, cursor, limit, sort, maxPricePaise, filters: raw } = query;
      let categoryId: string | undefined;
      let filters: ListingFilter[] = [];
      if (slug !== undefined) {
        const { category, defs } = await categoryOrThrow(slug);
        categoryId = category.id;
        const parsed = parseListingFilters(raw, category.config, defs);
        if (!parsed.ok) {
          const { code, key } = parsed.error;
          throw new AppError(400, code, `Filter "${key}" is not valid for ${category.name}`, {
            key,
          });
        }
        filters = parsed.filters;
      } else if (Object.keys(raw).length > 0) {
        const key = Object.keys(raw)[0]!;
        throw new AppError(400, 'UNKNOWN_FILTER', `Filter "${key}" needs a category`, { key });
      }
      const rows = await deps.listProducts({
        filters,
        sort,
        limit,
        ...(categoryId ? { categoryId } : {}),
        ...(maxPricePaise !== undefined ? { maxPricePaise } : {}),
        ...(cursor ? { after: decodeCursor(cursor, sort) } : {}),
      });
      const page = rows.slice(0, limit);
      const last = page.at(-1);
      return {
        items: await summarize(page),
        nextCursor:
          rows.length > limit && last ? encodeCursor(sortKey(last, sort), last.slug) : null,
      };
    },

    async getProduct(slug: string): Promise<ProductDetail> {
      const product = await deps.findProductBySlug(slug);
      if (!product) throw notFound('PRODUCT_NOT_FOUND', `No product "${slug}"`);
      const now = deps.now();
      const categoryId = product.category.id;
      const [defs, variants, ratings, book, faqs, edges, images] = await Promise.all([
        deps.listAttributeDefs(categoryId),
        deps.loadVariantStates([product.id], now),
        deps.loadRatings([product.id]),
        deps.loadOfferBook(now),
        deps.loadFaqs(product.id, categoryId),
        deps.loadRelationsFrom(product.id),
        deps.loadImages([product.id]),
      ]);
      if (variants.length === 0) throw notFound('PRODUCT_NOT_FOUND', `No product "${slug}"`);

      // Only products you can buy are suggested (D-17); each carries its reason (D-124).
      const targets = await deps.listProductsByIds([...new Set(edges.map((e) => e.toProductId))]);
      const buyable = new Map(targets.map((t) => [t.id, t]));
      const picks = pickSuggestions({
        edges: edges.filter((e) => buyable.has(e.toProductId) && e.type !== 'next_gen'),
        surface: 'pdp',
        exclude: new Set([product.id]),
      });
      const summaries = new Map(
        (await summarize(picks.map((p) => buyable.get(p.productId)!))).map((s) => [s.id, s]),
      );
      const next = edges.find((e) => e.type === 'next_gen' && buyable.has(e.toProductId));

      const optionKeys = [...new Set(variants.flatMap((v) => Object.keys(v.options)))];
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        modelNumber: product.modelNumber,
        lineName: product.lineName,
        tier: product.tier,
        status: product.status,
        category: { slug: product.category.slug, name: product.category.name },
        images: images.get(product.id) ?? [],
        explainer: product.explainer,
        whoFor: product.whoFor,
        notFor: product.notFor,
        dispatch:
          product.status === 'preorder' && product.dispatchFrom && product.dispatchTo
            ? { from: product.dispatchFrom, to: product.dispatchTo }
            : null,
        optionKeys,
        variants: variants.map((v): ProductVariant => {
          const { availability, price, flash } = priceVariant(
            v,
            product.status,
            categoryId,
            book,
            now,
          );
          return {
            id: v.id,
            sku: v.sku,
            options: v.options,
            availability,
            price,
            flash,
            offers: productOffers({
              categoryId,
              priceSource: price.priceSource,
              coupons: book.coupons,
              paymentOffers: book.paymentOffers,
              now,
            }),
          };
        }),
        specs: specGroups(product.category.config, defs, product.attributes),
        compatibility: compatibilityFacts(product.attributes, defs),
        returnPolicy: policySummary(product.category.returnPolicy),
        faqs,
        rating: ratingOf(ratings, product.id),
        suggestions: picks.flatMap((p) => {
          const summary = summaries.get(p.productId);
          return summary ? [{ product: summary, reason: p.reason }] : [];
        }),
        successor: next
          ? { slug: buyable.get(next.toProductId)!.slug, name: buyable.get(next.toProductId)!.name }
          : null,
      };
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
