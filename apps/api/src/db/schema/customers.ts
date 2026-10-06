import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { at, createdAt, customerId, id, pincodeCheck } from './columns';
import { variant } from './catalog';

// The customer's name, email and phone live on the Better Auth `user` (auth.ts).

/** Every address stores an exact map pin (D-53). At most one default per customer (D-188). */
export const address = pgTable(
  'address',
  {
    id: id(),
    customerId: customerId(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    line1: text('line1').notNull(),
    line2: text('line2'),
    landmark: text('landmark'),
    city: text('city').notNull(),
    state: text('state').notNull(),
    pincode: text('pincode').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index('address_customer').on(t.customerId, t.createdAt),
    uniqueIndex('address_one_default')
      .on(t.customerId)
      .where(sql`${t.isDefault}`),
    check('address_pincode', pincodeCheck(t.pincode)),
  ],
);

/** On-site only (D-147). */
export const watch = pgTable(
  'watch',
  {
    customerId: customerId(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variant.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.customerId, t.variantId] })],
);

/** Demo inbox + adapter log (D-101). */
export const notification = pgTable(
  'notification',
  {
    id: id(),
    customerId: customerId(),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    readAt: at('read_at'),
  },
  (t) => [index('notification_customer').on(t.customerId, t.createdAt)],
);
