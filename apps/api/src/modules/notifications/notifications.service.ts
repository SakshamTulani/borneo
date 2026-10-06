import { z } from 'zod';
import type { CustomerId, Notification, NotificationPage } from '@borneo/shared';
import { AppError, notFound } from '../../errors';
import type { InboxPosition, NotificationRow } from './notifications.repository';

export type NotificationsDeps = {
  now: () => number;
  list: (
    customerId: CustomerId,
    page: { after?: InboxPosition; limit: number },
  ) => Promise<NotificationRow[]>;
  countUnread: (customerId: CustomerId) => Promise<number>;
  markRead: (customerId: CustomerId, id: string, at: Date) => Promise<boolean>;
  markAllRead: (customerId: CustomerId, at: Date) => Promise<void>;
};

const cursorSchema = z.tuple([z.iso.datetime(), z.uuid()]);

/** Opaque to clients: base64url JSON of the last row's time and id. */
const encodeCursor = (row: NotificationRow) =>
  Buffer.from(JSON.stringify([row.createdAt.toISOString(), row.id])).toString('base64url');

function decodeCursor(cursor: string): InboxPosition {
  try {
    const [createdAt, id] = cursorSchema.parse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    );
    return { createdAt: new Date(createdAt), id };
  } catch {
    throw new AppError(400, 'INVALID_CURSOR', 'Cursor is invalid');
  }
}

const toNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  kind: row.kind as Notification['kind'],
  title: row.title,
  body: row.body,
  createdAt: row.createdAt.toISOString(),
  readAt: row.readAt?.toISOString() ?? null,
});

/** The account inbox (D-101): what the NotificationAdapter sent, newest first. */
export function createNotificationsService(deps: NotificationsDeps) {
  return {
    async list(
      customerId: CustomerId,
      query: { cursor?: string; limit: number },
    ): Promise<NotificationPage> {
      const after = query.cursor ? decodeCursor(query.cursor) : undefined;
      const [rows, unread] = await Promise.all([
        deps.list(customerId, { ...(after ? { after } : {}), limit: query.limit }),
        deps.countUnread(customerId),
      ]);
      const items = rows.slice(0, query.limit);
      const last = items.at(-1);
      return {
        items: items.map(toNotification),
        nextCursor: rows.length > query.limit && last ? encodeCursor(last) : null,
        unread,
      };
    },

    /** 404 for another customer's notification, same as a missing one (api-design). */
    async markRead(customerId: CustomerId, id: string): Promise<void> {
      if (!(await deps.markRead(customerId, id, new Date(deps.now())))) {
        throw notFound('NOTIFICATION_NOT_FOUND', 'No such notification');
      }
    },

    markAllRead: (customerId: CustomerId) => deps.markAllRead(customerId, new Date(deps.now())),
  };
}

export type NotificationsService = ReturnType<typeof createNotificationsService>;
