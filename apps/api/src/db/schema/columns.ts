import { sql } from 'drizzle-orm';
import { bigint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

// Column helpers so every table follows DATA_MODEL conventions.

export const id = () => uuid('id').primaryKey().defaultRandom();
/** Money is integer paise (ADR-0006); `number` mode is safe up to Number.MAX_SAFE_INTEGER. */
export const paise = (name: string) => bigint(name, { mode: 'number' });
export const at = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
export const createdAt = () => at('created_at').notNull().defaultNow();
export const updatedAt = () =>
  at('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
/** Indian PIN code: 6 digits, first 1–9. */
export const pincodeCheck = (column: unknown) => sql`${column} ~ '^[1-9][0-9]{5}$'`;
/** Customer identity (ADR-0005): the Better Auth user id. */
export const customerId = () =>
  text('customer_id')
    .notNull()
    .references(() => user.id);
