import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgEnum, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import type { RelationRule } from '@borneo/shared';
import { id } from './columns';
import { category, product } from './catalog';

export const relationType = pgEnum('relation_type', [
  'accessory',
  'compatible',
  'complementary',
  'replacement',
  'consumable',
  'upgrade',
  'prev_gen',
  'next_gen',
  'family_tier',
  'bundle_member',
]);
export const overrideAction = pgEnum('override_action', ['add', 'remove']);
export const relationSource = pgEnum('relation_source', ['rule', 'manual', 'line']);

export const relationRule = pgTable('relation_rule', {
  id: id(),
  type: relationType('type').notNull(),
  fromCategoryId: uuid('from_category_id')
    .notNull()
    .references(() => category.id),
  toCategoryId: uuid('to_category_id')
    .notNull()
    .references(() => category.id),
  match: jsonb('match').$type<RelationRule['match']>().notNull(),
  reasonTemplate: text('reason_template').notNull(),
});

export const relationOverride = pgTable(
  'relation_override',
  {
    id: id(),
    fromProductId: uuid('from_product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    toProductId: uuid('to_product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    type: relationType('type').notNull(),
    action: overrideAction('action').notNull(),
    reason: text('reason'),
  },
  (t) => [check('relation_override_not_self', sql`${t.fromProductId} <> ${t.toProductId}`)],
);

/** Materialised: rule edges ∪ line edges ∪ manual adds − manual removes (D-21). Rebuilt, never edited. */
export const relation = pgTable(
  'relation',
  {
    fromProductId: uuid('from_product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    toProductId: uuid('to_product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    type: relationType('type').notNull(),
    source: relationSource('source').notNull(),
    reason: text('reason').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.fromProductId, t.toProductId, t.type] }),
    index('relation_to').on(t.toProductId),
  ],
);
