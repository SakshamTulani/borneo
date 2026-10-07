import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { EyeIcon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { imageSource } from '@/shared/lib/image';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { StatusBadge } from '@/shared/ui/commerce/StatusBadge';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Badge } from '@/shared/ui/base/badge';
import { useToggleWatchMutation } from '../hooks/useToggleWatchMutation';
import { useWatchQuery } from '../hooks/useWatchQuery';
import type { WatchItem } from '../model';

function Availability({ item }: { item: WatchItem }) {
  if (item.availability === 'inStock') return <Badge variant="success">Back in stock</Badge>;
  if (item.availability === 'preorder') return <StatusBadge kind="preorder" />;
  if (item.availability === 'unavailable') return <Badge variant="neutral">No longer sold</Badge>;
  return <StatusBadge kind="outOfStock" />;
}

/** Watched items with where each stands now (D-222). */
const STEP = 12;

export function WatchPage() {
  const query = useWatchQuery();
  const [shown, setShown] = useState(STEP);
  const toggle = useToggleWatchMutation();
  if (query.isError && !query.data)
    return (
      <ErrorState title="Couldn't load your watch list" onRetry={() => void query.refetch()} />
    );
  if (!query.data) return <Skeleton className="h-40 w-full" aria-label="Loading your watch list" />;
  if (query.data.items.length === 0)
    return (
      <EmptyState
        icon={<EyeIcon className="size-9" strokeWidth={1.5} />}
        title="You're not watching anything"
        body="When something you want is out of stock, choose “Watch this item” on its page. It shows up here, with its stock, until you remove it."
      />
    );
  const items = query.data.items;
  return (
    <div className="space-y-4">
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.slice(0, shown).map((item) => (
          <li key={item.sku} className="flex gap-4 rounded-xl border border-line bg-surface p-4">
            {item.image ? (
              <img
                {...imageSource(item.image.src, { aspect: 1, widths: [96, 192] })}
                sizes="80px"
                alt=""
                className="size-20 shrink-0 rounded-lg bg-muted object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <Link
                  to="/products/$slug"
                  params={{ slug: item.slug }}
                  search={{ variant: item.sku }}
                  className="font-semibold hover:underline"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-ink-muted">
                  {[...Object.values(item.options), formatInr(item.pricePaise)].join(' · ')}
                </p>
              </div>
              <Availability item={item} />
              <div className="flex flex-wrap gap-2">
                {item.availability === 'inStock' || item.availability === 'preorder' ? (
                  <Link
                    to="/products/$slug"
                    params={{ slug: item.slug }}
                    search={{ variant: item.sku }}
                    className={buttonVariants()}
                  >
                    View
                  </Link>
                ) : null}
                <Button
                  variant="ghost"
                  loading={toggle.isPending && toggle.variables.sku === item.sku}
                  onClick={() => toggle.mutate({ sku: item.sku, watch: false })}
                >
                  Remove
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {items.length > shown ? (
        <Button variant="secondary" onClick={() => setShown(shown + STEP)}>
          Show more ({items.length - shown})
        </Button>
      ) : null}
    </div>
  );
}
