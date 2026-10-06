import type { Notification } from '@borneo/shared';
import { formatDateTime } from '@/shared/lib/format';
import type { InboxItem } from '../model';

export const toInboxItem = (n: Notification): InboxItem => ({
  id: n.id,
  title: n.title,
  body: n.body,
  when: formatDateTime(n.createdAt),
  at: n.createdAt,
  unread: n.readAt === null,
});
