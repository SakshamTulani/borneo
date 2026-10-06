import { useInfiniteQuery } from '@tanstack/react-query';
import { inboxQuery } from '../repository/notificationsRepository';

export function useInboxQuery() {
  return useInfiniteQuery(inboxQuery);
}
