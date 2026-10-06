import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { InboxIcon, LogOutIcon, MapPinIcon, UserRoundIcon } from 'lucide-react';
import { useSessionQuery, useSignOutMutation } from '@/features/auth';
import { useUnreadCountQuery } from '@/features/notifications';
import { Button } from '@/shared/ui/base/button';
import { Container } from '@/shared/ui/layout/Container';

const tab =
  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] text-ink outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand data-[status=active]:bg-surface data-[status=active]:font-semibold data-[status=active]:text-brand';

/** Account shell (PRD §4 post-purchase): sections, then the page. Orders join in Phase K/L. */
export function AccountLayout({
  children,
  onSignedOut,
}: {
  children: ReactNode;
  onSignedOut: () => void;
}) {
  const { data: customer } = useSessionQuery();
  const unread = useUnreadCountQuery();
  const signOut = useSignOutMutation();
  const count = unread.data ?? 0;

  return (
    <Container className="space-y-6 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-headline font-semibold tracking-tight">Your account</h1>
          {customer ? <p className="text-ink-muted">{customer.email}</p> : null}
        </div>
        <Button
          variant="ghost"
          loading={signOut.isPending}
          onClick={() => signOut.mutate(undefined, { onSuccess: onSignedOut })}
        >
          <LogOutIcon aria-hidden />
          Sign out
        </Button>
      </div>
      <nav aria-label="Account" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-1 rounded-full bg-muted p-1 sm:w-fit">
          <li>
            <Link to="/account" activeOptions={{ exact: true }} className={tab}>
              <UserRoundIcon className="size-4" aria-hidden />
              Overview
            </Link>
          </li>
          <li>
            <Link to="/account/addresses" className={tab}>
              <MapPinIcon className="size-4" aria-hidden />
              Addresses
            </Link>
          </li>
          <li>
            <Link to="/account/inbox" className={tab}>
              <InboxIcon className="size-4" aria-hidden />
              Inbox
              {count > 0 ? (
                <span className="rounded-full bg-brand px-2 text-xs font-semibold text-brand-ink tabular-nums">
                  {count}
                  <span className="sr-only"> unread</span>
                </span>
              ) : null}
            </Link>
          </li>
        </ul>
      </nav>
      {signOut.isError ? (
        <p role="alert" className="text-sm text-danger">
          Couldn’t sign out. Try again.
        </p>
      ) : null}
      <div>{children}</div>
    </Container>
  );
}
