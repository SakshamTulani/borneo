import { Link } from '@tanstack/react-router';
import { UserRoundIcon } from 'lucide-react';
import { useSessionQuery } from '../hooks/useSessionQuery';

const link =
  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-[15px] text-ink outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand';

/** Header link: "Sign in", or the customer's first name once signed in. */
export function AccountLink() {
  const { data: customer } = useSessionQuery();
  if (!customer) {
    return (
      <Link to="/sign-in" className={link}>
        <UserRoundIcon className="size-5" aria-hidden />
        Sign in
      </Link>
    );
  }
  const firstName = customer.name.split(/\s+/)[0] || 'Account';
  return (
    <Link to="/account" className={link} aria-label={`Your account (${customer.name})`}>
      <UserRoundIcon className="size-5" aria-hidden />
      <span className="max-w-32 truncate">{firstName}</span>
    </Link>
  );
}
