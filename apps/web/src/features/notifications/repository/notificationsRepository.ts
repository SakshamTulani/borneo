import { infiniteQueryOptions } from '@tanstack/react-query';
import { getNotifications, postRead, postReadAll } from '../api/notificationsApi';
import { toInboxItem } from '../mappers/toInboxItem';
import type { InboxPage } from '../model';

/** The account inbox, newest first (D-101). Under `['me']`: dropped when the session changes. */
export const inboxQuery = infiniteQueryOptions({
  queryKey: ['me', 'notifications'],
  queryFn: async ({ pageParam }): Promise<InboxPage> => {
    const page = await getNotifications(pageParam || undefined);
    return { items: page.items.map(toInboxItem), unread: page.unread, nextCursor: page.nextCursor };
  },
  initialPageParam: '',
  getNextPageParam: (last) => last.nextCursor ?? undefined,
  staleTime: 30_000,
});

export const markRead = postRead;
export const markAllRead = postReadAll;
