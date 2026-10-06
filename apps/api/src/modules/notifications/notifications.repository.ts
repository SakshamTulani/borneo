import { and, count, desc, eq, isNull, lt, or } from 'drizzle-orm';
import type { CustomerId, NotificationKind } from '@borneo/shared';
import type { Db } from '../../db/client';
import { notification } from '../../db/schema/index';

// Customer-scoped (ADR-0005): every query filters on customer_id.

export type NotificationRow = typeof notification.$inferSelect;
export type InboxEntry = { kind: NotificationKind; title: string; body: string };
/** Keyset position: newest first, id breaks ties. */
export type InboxPosition = { createdAt: Date; id: string };

/** `at` is set here (millisecond precision) so keyset cursors round-trip exactly. */
export async function insertNotification(
  customerId: CustomerId,
  db: Db,
  entry: InboxEntry,
  at: Date = new Date(),
): Promise<void> {
  await db.insert(notification).values({ customerId, ...entry, createdAt: at });
}

/** Newest first; one extra row tells the service there is a next page. */
export async function listNotifications(
  customerId: CustomerId,
  db: Db,
  page: { after?: InboxPosition; limit: number },
): Promise<NotificationRow[]> {
  const { after } = page;
  return db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.customerId, customerId),
        after
          ? or(
              lt(notification.createdAt, after.createdAt),
              and(eq(notification.createdAt, after.createdAt), lt(notification.id, after.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(notification.createdAt), desc(notification.id))
    .limit(page.limit + 1);
}

export async function countUnread(customerId: CustomerId, db: Db): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notification)
    .where(and(eq(notification.customerId, customerId), isNull(notification.readAt)));
  return row?.n ?? 0;
}

/** False when the customer has no such notification. Reading twice keeps the first time. */
export async function markNotificationRead(
  customerId: CustomerId,
  db: Db,
  id: string,
  at: Date,
): Promise<boolean> {
  const found = await db
    .select({ readAt: notification.readAt })
    .from(notification)
    .where(and(eq(notification.customerId, customerId), eq(notification.id, id)));
  if (found.length === 0) return false;
  await db
    .update(notification)
    .set({ readAt: at })
    .where(
      and(
        eq(notification.customerId, customerId),
        eq(notification.id, id),
        isNull(notification.readAt),
      ),
    );
  return true;
}

export async function markAllNotificationsRead(
  customerId: CustomerId,
  db: Db,
  at: Date,
): Promise<void> {
  await db
    .update(notification)
    .set({ readAt: at })
    .where(and(eq(notification.customerId, customerId), isNull(notification.readAt)));
}
