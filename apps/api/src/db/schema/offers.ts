import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { at, id, paise } from './columns';
import { variant } from './catalog';

export const offerKind = pgEnum('offer_kind', ['coupon', 'bank', 'no_cost_emi']);

export const bundle = pgTable(
  'bundle',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    pricePaise: paise('price_paise').notNull(),
    activeFrom: at('active_from').notNull(),
    activeTo: at('active_to'),
  },
  (t) => [check('bundle_price_positive', sql`${t.pricePaise} > 0`)],
);

export const bundleItem = pgTable(
  'bundle_item',
  {
    bundleId: uuid('bundle_id')
      .notNull()
      .references(() => bundle.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variant.id),
    qty: integer('qty').notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.bundleId, t.variantId] }),
    check('bundle_item_qty_positive', sql`${t.qty} > 0`),
  ],
);

/**
 * `rules` holds the kind-specific shape from `@borneo/shared` (couponSchema / paymentOfferSchema
 * without id and window). `applies_to_all` drives the effective-price line (D-32).
 */
export const offer = pgTable(
  'offer',
  {
    id: id(),
    kind: offerKind('kind').notNull(),
    code: text('code'),
    name: text('name').notNull(),
    rules: jsonb('rules').$type<Record<string, unknown>>().notNull(),
    appliesToAll: boolean('applies_to_all').notNull().default(false),
    activeFrom: at('active_from').notNull(),
    activeTo: at('active_to').notNull(),
  },
  (t) => [
    uniqueIndex('offer_code').on(sql`upper(${t.code})`),
    check('offer_coupon_has_code', sql`(${t.kind} = 'coupon') = (${t.code} is not null)`),
    check('offer_window', sql`${t.activeTo} > ${t.activeFrom}`),
  ],
);

/** Bank EMI plans for "from ₹X/mo" (D-33, D-47). No-cost EMI is an offer, not a plan (D-45). */
export const emiPlan = pgTable(
  'emi_plan',
  {
    id: id(),
    bank: text('bank').notNull(),
    tenureMonths: integer('tenure_months').notNull(),
    annualRateBps: integer('annual_rate_bps').notNull(),
    minAmountPaise: paise('min_amount_paise').notNull(),
  },
  (t) => [
    uniqueIndex('emi_plan_bank_tenure').on(t.bank, t.tenureMonths),
    check('emi_plan_tenure_positive', sql`${t.tenureMonths} > 0`),
    check('emi_plan_amounts', sql`${t.annualRateBps} >= 0 and ${t.minAmountPaise} >= 0`),
  ],
);

/** Real cap and timer (D-140). `sold` only moves by a conditional update against `cap`. */
export const flashSale = pgTable(
  'flash_sale',
  {
    id: id(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variant.id),
    salePricePaise: paise('sale_price_paise').notNull(),
    startsAt: at('starts_at').notNull(),
    endsAt: at('ends_at').notNull(),
    cap: integer('cap').notNull(),
    sold: integer('sold').notNull().default(0),
    perCustomerLimit: integer('per_customer_limit').notNull().default(1),
  },
  (t) => [
    check('flash_sale_window', sql`${t.endsAt} > ${t.startsAt}`),
    check('flash_sale_sold', sql`${t.sold} >= 0 and ${t.sold} <= ${t.cap}`),
    check('flash_sale_limit_one', sql`${t.perCustomerLimit} = 1`),
    check('flash_sale_price_cap', sql`${t.salePricePaise} > 0 and ${t.cap} > 0`),
  ],
);

export const disposableDomain = pgTable('disposable_domain', {
  domain: text('domain').primaryKey(),
});
