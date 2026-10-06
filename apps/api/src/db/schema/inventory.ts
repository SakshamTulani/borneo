import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, pincodeCheck } from './columns';
import { category, variant } from './catalog';

export const warehouse = pgTable(
  'warehouse',
  {
    id: id(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    pincode: text('pincode').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
  },
  (t) => [check('warehouse_pincode', pincodeCheck(t.pincode))],
);

/** Check-and-reserve is one conditional UPDATE; the checks are a last line of defence. */
export const inventory = pgTable(
  'inventory',
  {
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouse.id),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variant.id),
    onHand: integer('on_hand').notNull().default(0),
    reserved: integer('reserved').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.warehouseId, t.variantId] }),
    index('inventory_variant').on(t.variantId),
    check('inventory_bounds', sql`${t.reserved} >= 0 and ${t.reserved} <= ${t.onHand}`),
  ],
);

/** Pincode × category (D-50). No row means not deliverable (D-62). */
export const serviceability = pgTable(
  'serviceability',
  {
    pincode: text('pincode').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => category.id),
    deliverable: boolean('deliverable').notNull(),
    codAllowed: boolean('cod_allowed').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.pincode, t.categoryId] }),
    check('serviceability_pincode', pincodeCheck(t.pincode)),
    check('serviceability_cod_needs_delivery', sql`${t.deliverable} or not ${t.codAllowed}`),
  ],
);

/** Longest matching pincode prefix wins; "" matches every pincode (D-63). */
export const deliveryLane = pgTable(
  'delivery_lane',
  {
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouse.id),
    pincodePrefix: text('pincode_prefix').notNull(),
    minDays: integer('min_days').notNull(),
    maxDays: integer('max_days').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.warehouseId, t.pincodePrefix] }),
    check('delivery_lane_prefix', sql`${t.pincodePrefix} ~ '^[0-9]{0,6}$'`),
    check('delivery_lane_days', sql`${t.minDays} >= 0 and ${t.maxDays} >= ${t.minDays}`),
  ],
);
