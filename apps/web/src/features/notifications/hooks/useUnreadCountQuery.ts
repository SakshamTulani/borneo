import { useInfiniteQuery } from '@tanstack/react-query';
import { inboxQuery } from '../repository/notificationsRepository';

/** Unread messages, from the newest page of the inbox. `enabled`: only when signed in. */
export function useUnreadCountQuery(enabled = true) {
  return useInfiniteQuery({
    ...inboxQuery,
    enabled,
    select: (data) => data.pages[0]?.unread ?? 0,
  });
}
