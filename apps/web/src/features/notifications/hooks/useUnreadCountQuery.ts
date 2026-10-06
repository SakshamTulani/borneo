import { useInfiniteQuery } from '@tanstack/react-query';
import { inboxQuery } from '../repository/notificationsRepository';

/** Unread messages, from the newest page of the inbox. */
export function useUnreadCountQuery() {
  return useInfiniteQuery({ ...inboxQuery, select: (data) => data.pages[0]?.unread ?? 0 });
}
