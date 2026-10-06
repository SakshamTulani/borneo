import { InboxIcon } from 'lucide-react';
import { Badge } from '@/shared/ui/base/badge';
import { Button } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import type { InboxItem } from '../model';

type Props =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | {
      status: 'ready';
      items: InboxItem[];
      unread: number;
      onMarkRead: (id: string) => void;
      onMarkAllRead: () => void;
      markingAll?: boolean;
      hasMore?: boolean;
      loadingMore?: boolean;
      onLoadMore?: () => void;
      /** A failed "mark as read". */
      problem?: string | undefined;
    };

/** Account inbox (D-101, D-102): messages the store sent this customer, newest first. */
export function InboxView(props: Props) {
  if (props.status === 'loading') {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading messages">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }
  if (props.status === 'error') {
    return (
      <ErrorState
        title="Couldn’t load your messages"
        body="Please try again."
        onRetry={props.onRetry}
      />
    );
  }
  const { items, unread } = props;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<InboxIcon className="size-8" aria-hidden />}
        title="No messages yet"
        body="Order updates, refunds and account notices will appear here."
      />
    );
  }
  return (
    <div className="space-y-4">
      {props.problem ? <FormAlert>{props.problem}</FormAlert> : null}
      <div className="flex min-h-11 items-center justify-between gap-3">
        <p className="text-[15px] text-ink-muted" aria-live="polite">
          {unread === 0 ? 'All read' : `${unread} unread`}
        </p>
        {unread > 0 ? (
          <Button
            variant="secondary"
            onClick={props.onMarkAllRead}
            loading={props.markingAll ?? false}
          >
            Mark all as read
          </Button>
        ) : null}
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-line bg-surface p-5">
            <article aria-labelledby={`msg-${item.id}`} className="space-y-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 id={`msg-${item.id}`} className={item.unread ? 'font-semibold' : 'font-normal'}>
                  {item.title}
                </h3>
                {item.unread ? <Badge variant="info">New</Badge> : null}
              </div>
              <p className="text-[15px] text-ink-muted">{item.body}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm text-ink-muted">
                <time dateTime={item.at}>{item.when}</time>
                {item.unread ? (
                  <Button
                    variant="link"
                    className="h-11 px-0"
                    onClick={() => props.onMarkRead(item.id)}
                  >
                    Mark as read
                  </Button>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ul>
      {props.hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={props.onLoadMore} loading={props.loadingMore ?? false}>
            Show older messages
          </Button>
        </div>
      ) : null}
    </div>
  );
}
