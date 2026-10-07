import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { PlusIcon, ShieldCheckIcon, SmartphoneIcon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { formatDay } from '@/shared/lib/format';
import { imageSource } from '@/shared/lib/image';
import { useNow } from '@/shared/lib/useNow';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { useDevicesQuery } from '../hooks/useDevicesQuery';
import type { OwnedDevice } from '../model';

const iso = (ms: number) => new Date(ms).toISOString();

function Device({ device, now }: { device: OwnedDevice; now: number | undefined }) {
  // Client clock only: the line appears after hydration, so server and client markup match.
  const inWindow =
    now !== undefined && device.returnWindowEndsAt !== null && device.returnWindowEndsAt >= now;
  return (
    <li className="space-y-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex gap-4">
        {device.image ? (
          <img
            {...imageSource(device.image.src, { aspect: 1, widths: [160, 320] })}
            sizes="96px"
            alt={device.image.alt}
            className="size-24 shrink-0 rounded-lg bg-muted object-cover"
          />
        ) : null}
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-ink-muted">{device.category}</p>
          <Link
            to="/products/$slug"
            params={{ slug: device.slug }}
            className="font-heading text-lg font-semibold hover:underline"
          >
            {device.name}
          </Link>
          <p className="text-sm text-ink-muted">
            {[
              ...Object.values(device.options),
              `delivered ${formatDay(iso(device.deliveredAt))}`,
            ].join(' · ')}{' '}
            ·{' '}
            <Link
              to="/account/orders/$orderId"
              params={{ orderId: device.orderId }}
              className="text-brand hover:underline"
            >
              {device.orderNumber}
            </Link>
          </p>
          {inWindow && device.returnWindowEndsAt ? (
            <p className="flex items-center gap-1.5 text-sm">
              <ShieldCheckIcon className="size-4 text-success" aria-hidden />
              Returns open until {formatDay(iso(device.returnWindowEndsAt))}
            </p>
          ) : null}
        </div>
      </div>
      {device.accessories.length ? (
        <div className="space-y-2 border-t border-line pt-4">
          <h3 className="text-sm font-semibold">Goes well with your {device.name}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {device.accessories.map((a) => (
              <li key={a.slug}>
                <Link
                  to="/products/$slug"
                  params={{ slug: a.slug }}
                  className="flex items-center gap-3 rounded-lg bg-muted p-2 pr-3 outline-none hover:bg-line focus-visible:outline-2 focus-visible:outline-brand"
                >
                  {a.image ? (
                    <img
                      {...imageSource(a.image.src, { aspect: 1, widths: [96] })}
                      alt=""
                      className="size-12 shrink-0 rounded-md bg-surface object-cover"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{a.reason}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">{formatInr(a.pricePaise)}</span>
                  <PlusIcon className="size-4 shrink-0 text-brand" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/** What the customer owns, from delivered orders only (D-24, D-220). */
const STEP = 10;

export function DevicesPage() {
  const query = useDevicesQuery();
  const [shown, setShown] = useState(STEP);
  const now = useNow();
  if (query.isError && !query.data)
    return <ErrorState title="Couldn't load your devices" onRetry={() => void query.refetch()} />;
  if (!query.data) return <Skeleton className="h-60 w-full" aria-label="Loading your devices" />;
  if (query.data.items.length === 0)
    return (
      <EmptyState
        icon={<SmartphoneIcon className="size-9" strokeWidth={1.5} />}
        title="No devices yet"
        body="Products you buy from Borneo appear here once they're delivered, with accessories that fit them."
        action={
          <Link to="/" className={buttonVariants()}>
            Start shopping
          </Link>
        }
      />
    );
  const items = query.data.items;
  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {items.slice(0, shown).map((d) => (
          <Device key={d.productId} device={d} now={now} />
        ))}
      </ul>
      {items.length > shown ? (
        <Button variant="secondary" onClick={() => setShown(shown + STEP)}>
          Show more devices ({items.length - shown})
        </Button>
      ) : null}
    </div>
  );
}
