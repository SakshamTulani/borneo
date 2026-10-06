import { errorMessage } from '@/shared/lib/errors';
import { useInboxQuery } from '../hooks/useInboxQuery';
import { useMarkAllReadMutation } from '../hooks/useMarkAllReadMutation';
import { useMarkReadMutation } from '../hooks/useMarkReadMutation';
import { InboxView } from './InboxView';

export function InboxPage() {
  const inbox = useInboxQuery();
  const markRead = useMarkReadMutation();
  const markAll = useMarkAllReadMutation();

  if (inbox.isPending) return <InboxView status="loading" />;
  if (inbox.isError) return <InboxView status="error" onRetry={() => void inbox.refetch()} />;
  return (
    <InboxView
      status="ready"
      items={inbox.data.pages.flatMap((p) => p.items)}
      unread={inbox.data.pages[0]?.unread ?? 0}
      onMarkRead={(id) => markRead.mutate(id)}
      onMarkAllRead={() => markAll.mutate()}
      markingAll={markAll.isPending}
      hasMore={inbox.hasNextPage}
      loadingMore={inbox.isFetchingNextPage}
      onLoadMore={() => void inbox.fetchNextPage()}
      problem={
        markRead.error || markAll.error ? errorMessage(markRead.error ?? markAll.error) : undefined
      }
    />
  );
}
