import { z } from 'zod';
import { idSchema, pageSchema } from './common';

/** Messages the NotificationAdapter sends (D-101). Returns join later. */
export const notificationKindSchema = z.enum([
  'password_reset',
  'password_changed',
  'order_confirmed',
  'order_cancelled',
  'order_refunded',
]);
export type NotificationKind = z.infer<typeof notificationKindSchema>;

/** One account inbox entry. Never carries a secret such as a reset code (D-98). */
export const notificationSchema = z.object({
  id: idSchema,
  kind: notificationKindSchema,
  title: z.string(),
  body: z.string(),
  /** ISO 8601, UTC. */
  createdAt: z.string(),
  readAt: z.string().nullable(),
});
export type Notification = z.infer<typeof notificationSchema>;

/** `GET /me/notifications`: newest first, with the unread count for the badge. */
export const notificationPageSchema = pageSchema(notificationSchema).extend({
  unread: z.number().int().nonnegative(),
});
export type NotificationPage = z.infer<typeof notificationPageSchema>;
