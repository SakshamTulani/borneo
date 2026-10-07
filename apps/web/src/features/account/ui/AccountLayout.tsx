import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  EyeIcon,
  HeartIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MapPinIcon,
  PackageIcon,
  RotateCcwIcon,
  SmartphoneIcon,
  StarIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useSessionQuery, useSignOutMutation } from '@/features/auth';
import { useUnreadCountQuery } from '@/features/notifications';
import { Button } from '@/shared/ui/base/button';
import { Container } from '@/shared/ui/layout/Container';
import { initials } from '../mappers/initials';

const tab =
  'inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-full px-4 text-[15px] text-ink outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand data-[status=active]:bg-surface data-[status=active]:font-semibold data-[status=active]:text-brand lg:w-full lg:rounded-lg lg:px-3 lg:data-[status=active]:bg-brand-soft';

const SECTIONS = [
  { to: '/account', label: 'Overview', icon: LayoutDashboardIcon, exact: true },
  { to: '/account/orders', label: 'Orders', icon: PackageIcon },
  { to: '/account/returns', label: 'Returns', icon: RotateCcwIcon },
  { to: '/account/devices', label: 'My devices', icon: SmartphoneIcon },
  { to: '/account/reviews', label: 'Reviews', icon: StarIcon },
  { to: '/account/wishlist', label: 'Wishlist', icon: HeartIcon },
  { to: '/account/watch', label: 'Watch list', icon: EyeIcon },
  { to: '/account/addresses', label: 'Addresses', icon: MapPinIcon },
  { to: '/account/profile', label: 'Profile & security', icon: UserRoundIcon },
] as const;

/** Account shell (PRD §4 post-purchase): who is signed in, the sections, then the page. */
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
    <Container className="py-8 sm:py-10">
      <div className="grid gap-6 lg:grid-cols-[248px_1fr] lg:gap-10">
        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-brand-ink"
            >
              {customer ? initials(customer.name) : ''}
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-tagline font-semibold tracking-tight">
                {customer ? `Hi, ${customer.name.split(/\s+/)[0]}` : 'Your account'}
              </h1>
              {customer ? (
                <p className="truncate text-sm text-ink-muted">{customer.email}</p>
              ) : null}
            </div>
          </div>
          <nav aria-label="Account" className="-mx-1 overflow-x-auto px-1">
            <ul className="flex gap-1 rounded-full bg-muted p-1 lg:flex-col lg:rounded-xl lg:bg-transparent lg:p-0">
              {SECTIONS.map(({ to, label, icon: Icon, ...rest }) => (
                <li key={to}>
                  <Link to={to} activeOptions={{ exact: 'exact' in rest }} className={tab}>
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
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
          <Button
            variant="ghost"
            loading={signOut.isPending}
            onClick={() => signOut.mutate(undefined, { onSuccess: onSignedOut })}
          >
            <LogOutIcon aria-hidden />
            Sign out
          </Button>
          {signOut.isError ? (
            <p role="alert" className="text-sm text-danger">
              Couldn’t sign out. Try again.
            </p>
          ) : null}
        </aside>
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </Container>
  );
}
