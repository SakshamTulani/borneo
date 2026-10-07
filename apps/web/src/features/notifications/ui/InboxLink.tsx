import { Link } from '@tanstack/react-router';
import { InboxIcon } from 'lucide-react';
import { useSessionQuery } from '@/features/auth';
import { useUnreadCountQuery } from '../hooks/useUnreadCountQuery';

/** Header link to the account inbox with the unread count (signed in only, D-101). */
export function InboxLink() {
  const { data: customer } = useSessionQuery();
  const unread = useUnreadCountQuery(Boolean(customer)).data ?? 0;
  if (!customer) return null;
  return (
    <Link
      to="/account/inbox"
      className="relative inline-flex size-11 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand"
      aria-label={`Inbox${unread ? `, ${unread} unread` : ''}`}
    >
      <InboxIcon className="size-5" aria-hidden />
      {unread ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-brand px-1 text-center text-xs font-semibold text-brand-ink tabular-nums"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
