import { Link } from '@tanstack/react-router';
import { ChevronRightIcon, PackageIcon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { formatDateRange, formatDay } from '@/shared/lib/format';
import { imageSource } from '@/shared/lib/image';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { useOrdersQuery } from '../hooks/useOrdersQuery';
import { itemsLine } from '../mappers/orderText';
import type { OrderSummary } from '../model';
import { OrderStatusBadge } from './OrderStatusBadge';

const iso = (ms: number) => new Date(ms).toISOString();

function OrderRow({ order }: { order: OrderSummary }) {
  return (
    <li>
      <Link
        to="/account/orders/$orderId"
        params={{ orderId: order.id }}
        className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-4 outline-none hover:border-line-strong focus-visible:outline-2 focus-visible:outline-brand sm:p-5"
      >
        <div className="flex shrink-0 -space-x-4" aria-hidden>
          {order.items.slice(0, 3).map((i, n) =>
            i.image ? (
              <img
                key={n}
                {...imageSource(i.image.src, { aspect: 1, widths: [96, 192] })}
                sizes="64px"
                alt=""
                loading="lazy"
                className="size-16 rounded-lg border-2 border-surface bg-muted object-cover"
              />
            ) : (
              <span
                key={n}
                className="flex size-16 items-center justify-center rounded-lg border-2 border-surface bg-muted"
              >
                <PackageIcon className="size-6 text-ink-muted" />
              </span>
            ),
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Order {order.number}</span>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="truncate text-[15px]">
            {itemsLine(
              order.items.map((i) => i.name),
              order.itemCount,
            )}
          </p>
          <p className="text-sm text-ink-muted">
            Placed {formatDay(iso(order.placedAt))} · {formatInr(order.totalPaise)}
            {order.deliveredAt
              ? ` · Delivered ${formatDay(iso(order.deliveredAt))}`
              : order.eta && !['cancelled', 'refunded'].includes(order.status)
                ? ` · Arrives ${formatDateRange(order.eta.from, order.eta.to)}`
                : ''}
          </p>
        </div>
        <ChevronRightIcon
          className="size-5 shrink-0 text-ink-muted group-hover:text-ink"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/** The account's orders, newest first, ten at a time. */
export function OrdersPage() {
  const query = useOrdersQuery();
  if (query.isError && !query.data)
    return <ErrorState title="Couldn't load your orders" onRetry={() => void query.refetch()} />;
  if (!query.data)
    return (
      <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading your orders">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  const orders = query.data.pages.flatMap((p) => p.items);
  if (orders.length === 0)
    return (
      <EmptyState
        icon={<PackageIcon className="size-9" strokeWidth={1.5} />}
        title="No orders yet"
        body="When you place an order you can track it, cancel it before it ships and ask for returns here."
        action={
          <Link to="/" className={buttonVariants()}>
            Start shopping
          </Link>
        }
      />
    );
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {orders.map((o) => (
          <OrderRow key={o.id} order={o} />
        ))}
      </ul>
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show older orders
        </Button>
      ) : null}
    </div>
  );
}
