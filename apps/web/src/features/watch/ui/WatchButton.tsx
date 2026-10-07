import { Link, useLocation } from '@tanstack/react-router';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { canWatch, type Availability } from '@borneo/shared';
import { useSessionQuery } from '@/features/auth';
import { errorMessage } from '@/shared/lib/errors';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { useToggleWatchMutation } from '../hooks/useToggleWatchMutation';
import { useWatchQuery } from '../hooks/useWatchQuery';

/**
 * Watch (D-147, D-222): on a product page whose chosen variant is out of stock. Signed out, it
 * asks to sign in first. On-site only: the account's watch list shows when it is back.
 */
export function WatchButton({ sku, availability }: { sku: string; availability: Availability }) {
  const { data: customer } = useSessionQuery();
  const location = useLocation();
  const list = useWatchQuery(Boolean(customer));
  const toggle = useToggleWatchMutation();
  const watching = list.data?.items.some((i) => i.sku === sku) ?? false;
  if (!canWatch(availability) && !watching) return null;

  if (!customer)
    return (
      <Link
        to="/sign-in"
        search={{ redirect: location.href }}
        className={buttonVariants({ variant: 'outline', className: 'w-full' })}
      >
        <EyeIcon aria-hidden />
        Sign in to watch this item
      </Link>
    );

  return (
    <div className="space-y-1.5">
      <Button
        variant="outline"
        className="w-full"
        loading={toggle.isPending || list.isPending}
        aria-pressed={watching}
        onClick={() => toggle.mutate({ sku, watch: !watching })}
      >
        {watching ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
        {watching ? 'Watching: stop watching' : 'Watch this item'}
      </Button>
      <p className="text-sm text-ink-muted">
        {toggle.isError
          ? errorMessage(toggle.error)
          : watching
            ? 'Your account’s watch list shows when it’s back in stock.'
            : 'We don’t send messages: check your watch list in your account.'}
      </p>
    </div>
  );
}
