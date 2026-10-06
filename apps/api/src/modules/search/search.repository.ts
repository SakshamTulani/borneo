import { and, asc, desc, eq, inArray, lte, sql, type SQL } from 'drizzle-orm';
import type { SynonymGroup } from '@borneo/shared';
import type { Db } from '../../db/client';
import { category, product, productLine, searchSynonym } from '../../db/schema/index';
import { cheapestVariant, type ListingRow } from '../catalog/index';

/** Discontinued products leave search like they leave listings (D-17). */
const LISTED = ['live', 'preorder'] as const;
const UNKNOWN_LAUNCH = '0000-01-01';

/**
 * Typo tolerance (ADR-0002): a product matches when a term's `word_similarity` with its
 * searchable text reaches this. 0.4 lets "pulze" find Pulse and "earbds" find earbuds.
 */
export const MIN_WORD_SIMILARITY = 0.4; // D-182

export type SearchRow = ListingRow & {
  modelNumber: string;
  skus: string[];
  /** Best term match, 0–1; 1 for an exact or prefix SKU / model number. */
  score: number;
};

export type SearchQuery = {
  /** Already normalised (`searchIntent`). Empty: no text filter (category named outright). */
  terms: string[];
  categoryId?: string;
  maxPricePaise?: number;
  /** `price`: cheapest first, for alternatives (D-114). Default: best match, then newest. */
  order?: 'relevance' | 'price';
  limit: number;
};

export async function listSynonyms(db: Db): Promise<SynonymGroup[]> {
  return db
    .select({ term: searchSynonym.term, synonyms: searchSynonym.synonyms })
    .from(searchSynonym)
    .orderBy(asc(searchSynonym.term));
}

const textArray = (values: string[]) =>
  sql`array[${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  )}]::text[]`;

/**
 * Qualified on purpose: without joins Drizzle renders `product.id` as a bare "id", which inside
 * a `variant v` subquery would bind to v.id.
 */
const productIdRef = sql.raw('"product"."id"');

/** All SKUs of the outer product row. */
const skusOf = () =>
  sql<
    string[]
  >`coalesce((select array_agg(v.sku order by v.sku) from variant v where v.product_id = ${productIdRef}), '{}')`;

/** Listed products matching any term, best first (D-110–113). */
export async function searchProducts(db: Db, q: SearchQuery): Promise<SearchRow[]> {
  const cheapest = cheapestVariant(db);
  let score: SQL<number> = sql<number>`1`;
  if (q.terms.length > 0) {
    const terms = textArray(q.terms);
    const doc = sql`lower(${product.name} || ' ' || ${productLine.name} || ' ' || ${category.name} || ' ' || ${product.modelNumber})`;
    // A typed SKU or model number (or its start) is the strongest signal.
    const codeHit = sql`exists (select 1 from unnest(${terms}) t where length(t) >= 3 and (lower(${product.modelNumber}) like t || '%' or exists (select 1 from variant v where v.product_id = ${productIdRef} and lower(v.sku) like t || '%')))`;
    score = sql<number>`case when ${codeHit} then 1 else (select max(word_similarity(t, ${doc})) from unnest(${terms}) t) end`;
  }
  const launched = sql<string>`coalesce(${product.launchedAt}::text, ${UNKNOWN_LAUNCH})`;

  const rows = await db
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
      modelNumber: product.modelNumber,
      skus: skusOf(),
      score: sql<number>`(${score})::float`,
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
        q.terms.length > 0 ? sql`${score} >= ${MIN_WORD_SIMILARITY}` : undefined,
      ),
    )
    .orderBy(
      ...(q.order === 'price' ? [asc(cheapest.pricePaise)] : [desc(score), desc(launched)]),
      asc(product.slug),
    )
    .limit(q.limit);
  return rows.map((r) => ({ ...r, score: Number(r.score) }));
}

export type ExactCandidate = { slug: string; name: string; modelNumber: string; skus: string[] };

/**
 * Products (any status but draft: discontinued pages stay, D-17) whose name, slug, model number
 * or a SKU equals the query, ignoring case. `exactMatch` makes the final call (D-110).
 */
export async function findExactCandidates(db: Db, query: string): Promise<ExactCandidate[]> {
  const q = query.toLowerCase();
  return db
    .select({
      slug: product.slug,
      name: product.name,
      modelNumber: product.modelNumber,
      skus: skusOf(),
    })
    .from(product)
    .where(
      and(
        sql`${product.status} <> 'draft'`,
        sql`(lower(${product.name}) in (${q}, ${`borneo ${q}`}) or ${product.slug} = ${q.replace(/\s+/g, '-')} or lower(${product.modelNumber}) = ${q} or exists (select 1 from variant v where v.product_id = ${productIdRef} and lower(v.sku) = ${q}))`,
      ),
    )
    .limit(5);
}
