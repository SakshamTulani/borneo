import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  EyeIcon,
  PackageIcon,
  PencilIcon,
  RotateCcwIcon,
  SmartphoneIcon,
  StarIcon,
} from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { useSessionQuery } from '@/features/auth';
import { OrderStatusBadge, useOrdersQuery } from '@/features/orders';
import { useMyReviewsQuery } from '@/features/reviews';
import { formatDay } from '@/shared/lib/format';
import { imageSource } from '@/shared/lib/image';
import { buttonVariants } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { useAccountSummaryQuery } from '../hooks/useAccountSummaryQuery';

const spacedMobile = (phone: string) => `${phone.slice(0, 5)} ${phone.slice(5)}`;
const iso = (ms: number) => new Date(ms).toISOString();
const monthYear = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});
const card = 'rounded-xl border border-line bg-surface p-5';
const more = 'inline-flex min-h-11 items-center gap-1 text-[15px] text-brand hover:underline';

function Stat({
  to,
  icon,
  value,
  label,
  hint,
}: {
  to:
    | '/account/orders'
    | '/account/devices'
    | '/account/reviews'
    | '/account/watch'
    | '/account/returns';
  icon: ReactNode;
  value: number | undefined;
  label: string;
  hint?: string | undefined;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 outline-none hover:border-line-strong focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span
        className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand"
        aria-hidden
      >
        {icon}
      </span>
      <span className="text-2xl font-semibold tabular-nums">
        {value ?? <Skeleton className="h-7 w-8" />}
      </span>
      <span className="text-sm">
        {label}
        {hint ? <span className="block text-ink-muted">{hint}</span> : null}
      </span>
    </Link>
  );
}

/** The account at a glance (D-223): profile, counts, recent orders and what to review. */
export function AccountOverview() {
  const { data: customer } = useSessionQuery();
  const summary = useAccountSummaryQuery().data;
  const orders = useOrdersQuery();
  const reviews = useMyReviewsQuery();
  if (!customer) return null;
  const recent = orders.data?.pages[0]?.items.slice(0, 3) ?? [];
  const prompts = reviews.data?.prompts.slice(0, 2) ?? [];

  return (
    <div className="space-y-6">
      <section aria-labelledby="details" className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="details" className="font-semibold">
            Your details
          </h2>
          <Link to="/account/profile" className={buttonVariants({ variant: 'ghost' })}>
            <PencilIcon aria-hidden />
            Edit
          </Link>
        </div>
        <dl className="mt-2 grid gap-x-8 gap-y-3 text-[15px] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm text-ink-muted">Name</dt>
            <dd className="font-medium">{customer.name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm text-ink-muted">Email</dt>
            <dd className="font-medium break-all">{customer.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Mobile</dt>
            <dd className="font-medium tabular-nums">
              {customer.phone ? spacedMobile(customer.phone) : 'Not added'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Member since</dt>
            <dd className="font-medium">
              {summary?.memberSince ? monthYear.format(new Date(summary.memberSince)) : '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-label="At a glance"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
      >
        <Stat
          to="/account/orders"
          icon={<PackageIcon className="size-4" />}
          value={summary?.orders}
          label="Orders"
          hint={summary?.activeOrders ? `${summary.activeOrders} on the way` : undefined}
        />
        <Stat
          to="/account/devices"
          icon={<SmartphoneIcon className="size-4" />}
          value={summary?.devices}
          label="My devices"
        />
        <Stat
          to="/account/reviews"
          icon={<StarIcon className="size-4" />}
          value={summary?.reviewPrompts}
          label="To review"
        />
        <Stat
          to="/account/watch"
          icon={<EyeIcon className="size-4" />}
          value={summary?.watching}
          label="Watching"
        />
        <Stat
          to="/account/returns"
          icon={<RotateCcwIcon className="size-4" />}
          value={summary?.openReturns}
          label="Open returns"
        />
      </section>

      <section aria-labelledby="recent" className={card}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="recent" className="font-semibold">
            Recent orders
          </h2>
          {recent.length ? (
            <Link to="/account/orders" className={more}>
              All orders
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
        {orders.isPending ? (
          <Skeleton className="mt-3 h-20 w-full" />
        ) : recent.length === 0 ? (
          <div className="mt-2 space-y-3">
            <p className="text-[15px] text-ink-muted">
              No orders yet. Track deliveries, cancel before dispatch, and ask for returns here once
              you’ve ordered.
            </p>
            <Link to="/" className={buttonVariants()}>
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {recent.map((o) => (
              <li key={o.id}>
                <Link
                  to="/account/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="flex items-center gap-3 py-3 outline-none hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                >
                  {o.items[0]?.image ? (
                    <img
                      {...imageSource(o.items[0].image.src, { aspect: 1, widths: [96] })}
                      alt=""
                      className="size-12 shrink-0 rounded-lg bg-muted object-cover"
                    />
                  ) : (
                    <span className="size-12 shrink-0 rounded-lg bg-muted" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {o.items[0]?.name}
                      {o.itemCount > 1 ? ` and ${o.itemCount - 1} more` : ''}
                    </span>
                    <span className="block text-sm text-ink-muted">
                      {o.number} · {formatDay(iso(o.placedAt))} · {formatInr(o.totalPaise)}
                    </span>
                  </span>
                  <OrderStatusBadge status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {prompts.length ? (
        <section aria-labelledby="to-review" className={card}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="to-review" className="font-semibold">
              How are they working out?
            </h2>
            <Link to="/account/reviews" className={more}>
              Write a review
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="mt-3 flex flex-wrap gap-3">
            {prompts.map((p) => (
              <li
                key={p.orderItemId}
                className="flex items-center gap-3 rounded-lg bg-muted py-2 pr-4 pl-2 text-sm"
              >
                {p.image ? (
                  <img
                    {...imageSource(p.image.src, { aspect: 1, widths: [96] })}
                    alt=""
                    className="size-10 rounded-md object-cover"
                  />
                ) : null}
                {p.productName}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
