import { Link, useLocation } from '@tanstack/react-router';
import { HeartIcon } from 'lucide-react';
import { useSessionQuery } from '@/features/auth';
import { errorMessage } from '@/shared/lib/errors';
import { cn } from '@/shared/lib/utils';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { useToggleWishlistMutation } from '../hooks/useToggleWishlistMutation';
import { useWishlistSlugsQuery } from '../hooks/useWishlistSlugsQuery';

const round =
  'inline-flex size-11 items-center justify-center rounded-full bg-surface/90 shadow-sm backdrop-blur outline-none hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand';

/**
 * The wishlist heart (D-235): on cards (`compact`, over the photo) and on the product page.
 * Signed out, it asks to sign in first and comes back here.
 */
export function WishlistButton({
  slug,
  name,
  compact = false,
}: {
  slug: string;
  name: string;
  compact?: boolean;
}) {
  const { data: customer } = useSessionQuery();
  const location = useLocation();
  const saved = useWishlistSlugsQuery(Boolean(customer)).data?.includes(slug) ?? false;
  const toggle = useToggleWishlistMutation();
  const label = saved ? `Remove ${name} from your wishlist` : `Save ${name} to your wishlist`;
  const heart = (
    <HeartIcon
      aria-hidden
      className={cn('size-5', saved ? 'fill-current text-danger' : 'text-ink')}
    />
  );

  if (!customer)
    return (
      <Link
        to="/sign-in"
        search={{ redirect: location.href }}
        aria-label={`Sign in to save ${name} to your wishlist`}
        className={compact ? round : buttonVariants({ variant: 'ghost' })}
      >
        {heart}
        {compact ? null : 'Save'}
      </Link>
    );

  const onClick = () => toggle.mutate({ slug, save: !saved });
  return compact ? (
    <button
      type="button"
      className={round}
      aria-label={label}
      aria-pressed={saved}
      disabled={toggle.isPending}
      onClick={onClick}
    >
      {heart}
    </button>
  ) : (
    <div className="inline-flex flex-col">
      <Button variant="ghost" aria-pressed={saved} loading={toggle.isPending} onClick={onClick}>
        {heart}
        {saved ? 'Saved' : 'Save'}
        <span className="sr-only"> to your wishlist</span>
      </Button>
      {toggle.isError ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(toggle.error)}
        </p>
      ) : null}
    </div>
  );
}
