import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { CategoryConfig } from '@borneo/shared';
import { createdAt, id, paise } from './columns';

export const categoryDepth = pgEnum('category_depth', ['full', 'template']);
export const returnPolicy = pgEnum('return_policy', ['return', 'replacementOnly']);
export const attributeType = pgEnum('attribute_type', ['enum', 'number', 'bool', 'text', 'list']);
export const productTier = pgEnum('product_tier', ['value', 'upper_mid', 'premium']);
export const familyTier = pgEnum('family_tier', ['standard', 'pro', 'premium']);
export const productStatus = pgEnum('product_status', [
  'draft',
  'live',
  'preorder',
  'discontinued',
]);
export const mediaKind = pgEnum('media_kind', ['image', 'video']);

export const category = pgTable('category', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => category.id),
  depth: categoryDepth('depth').notNull(),
  config: jsonb('config').$type<CategoryConfig>().notNull(),
  /** D-89: per-category config, never inferred from the category key. */
  returnPolicy: returnPolicy('return_policy').notNull(),
  sort: integer('sort').notNull().default(0),
});

export const attributeDef = pgTable(
  'attribute_def',
  {
    id: id(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => category.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    type: attributeType('type').notNull(),
    unit: text('unit'),
    options: text('options').array(),
    /** Display labels for coded options (`usb_c` → "USB-C"). */
    optionLabels: jsonb('option_labels').$type<Record<string, string>>(),
    filterable: boolean('filterable').notNull().default(false),
    comparable: boolean('comparable').notNull().default(false),
    compat: boolean('compat').notNull().default(false),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [
    uniqueIndex('attribute_def_category_key').on(t.categoryId, t.key),
    check('attribute_def_compat_not_text', sql`not (${t.compat} and ${t.type} = 'text')`),
  ],
);

export const productLine = pgTable('product_line', {
  id: id(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => category.id),
  name: text('name').notNull(),
});

export const product = pgTable(
  'product',
  {
    id: id(),
    lineId: uuid('line_id')
      .notNull()
      .references(() => productLine.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => category.id),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    modelNumber: text('model_number').notNull().unique(),
    generation: integer('generation').notNull(),
    tier: productTier('tier').notNull(),
    familyTier: familyTier('family_tier').notNull(),
    status: productStatus('status').notNull(),
    /** Validated against the category's attribute definitions (D-16). */
    attributes: jsonb('attributes').$type<Record<string, unknown>>().notNull().default({}),
    explainer: text('explainer'),
    whoFor: text('who_for'),
    notFor: text('not_for'),
    launchedAt: date('launched_at', { mode: 'string' }),
    /** Pre-orders: expected dispatch range, IST dates (D-64, D-146). */
    dispatchFrom: date('dispatch_from', { mode: 'string' }),
    dispatchTo: date('dispatch_to', { mode: 'string' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('product_category_idx').on(t.categoryId),
    index('product_line_idx').on(t.lineId),
    index('product_attributes').using('gin', t.attributes),
    index('product_name_trgm').using('gin', t.name.op('gin_trgm_ops')),
    index('product_model_number_trgm').using('gin', t.modelNumber.op('gin_trgm_ops')),
    check('product_generation_positive', sql`${t.generation} > 0`),
    check(
      'product_preorder_dispatch',
      sql`${t.status} <> 'preorder' or (${t.dispatchFrom} is not null and ${t.dispatchTo} >= ${t.dispatchFrom})`,
    ),
  ],
);

export const variant = pgTable(
  'variant',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull().unique(),
    options: jsonb('options').$type<Record<string, string>>().notNull().default({}),
    mrpPaise: paise('mrp_paise').notNull(),
    pricePaise: paise('price_paise').notNull(),
    /** Pre-orders reserve against this cap, not warehouse stock (D-65). Null = not on pre-order. */
    preorderCap: integer('preorder_cap'),
    preorderSold: integer('preorder_sold').notNull().default(0),
  },
  (t) => [
    index('variant_product').on(t.productId),
    index('variant_sku_trgm').using('gin', t.sku.op('gin_trgm_ops')),
    // D-31: MRP is genuine, so the selling price never exceeds it.
    check('variant_price_le_mrp', sql`${t.pricePaise} > 0 and ${t.pricePaise} <= ${t.mrpPaise}`),
    check(
      'variant_preorder_sold',
      sql`${t.preorderSold} >= 0 and (${t.preorderCap} is null or ${t.preorderSold} <= ${t.preorderCap})`,
    ),
  ],
);

export const media = pgTable('media', {
  id: id(),
  productId: uuid('product_id')
    .notNull()
    .references(() => product.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => variant.id, { onDelete: 'cascade' }),
  kind: mediaKind('kind').notNull(),
  s3Key: text('s3_key').notNull(),
  alt: text('alt').notNull(),
  sort: integer('sort').notNull().default(0),
});

export const faq = pgTable(
  'faq',
  {
    id: id(),
    productId: uuid('product_id').references(() => product.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => category.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [check('faq_one_owner', sql`num_nonnulls(${t.productId}, ${t.categoryId}) = 1`)],
);

export const searchSynonym = pgTable('search_synonym', {
  id: id(),
  term: text('term').notNull().unique(),
  synonyms: text('synonyms').array().notNull(),
});
