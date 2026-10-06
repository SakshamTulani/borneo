import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Better Auth tables (its default model and field names). The customer id is `user.id` (ADR-0005).
// Only `src/session/` reads or writes them, through Better Auth.

const at = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const stamps = {
  createdAt: at('created_at').notNull().defaultNow(),
  updatedAt: at('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Email is the login identifier (D-91); unverified in demo (D-93). Phone is collected at sign-up (D-91). */
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  phone: text('phone'),
  ...stamps,
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: at('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...stamps,
  },
  (t) => [index('session_user').on(t.userId)],
);

/** Holds the password hash (`provider_id = 'credential'`). */
export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: at('access_token_expires_at'),
    refreshTokenExpiresAt: at('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    ...stamps,
  },
  (t) => [index('account_user').on(t.userId)],
);

/** Password reset codes (stored hashed). */
export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: at('expires_at').notNull(),
    ...stamps,
  },
  (t) => [index('verification_identifier').on(t.identifier)],
);
