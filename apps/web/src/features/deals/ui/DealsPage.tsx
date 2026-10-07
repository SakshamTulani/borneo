import { useEffect } from 'react';
import { track } from '@/features/analytics';
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { CalendarClockIcon, ZapIcon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { imageSource } from '@/shared/lib/image';
import { formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { Countdown } from '@/shared/ui/commerce/Countdown';
import { StatusBadge } from '@/shared/ui/commerce/StatusBadge';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Container } from '@/shared/ui/layout/Container';
import { useDealsQuery } from '../hooks/useDealsQuery';
import type { Deal } from '../model';

const iso = (ms: number) => new Date(ms).toISOString();

function DealCard({ deal }: { deal: Deal }) {
  const { product } = deal;
  const soldOut = deal.state === 'soldOut';
  const upcoming = deal.state === 'upcoming';
  return (
    <li
      className={cn(
        'relative flex flex-col gap-3 rounded-xl border border-line bg-surface p-4',
        soldOut && 'opacity-75',
      )}
    >
      {product.image ? (
        <img
          {...imageSource(product.image.src, { aspect: 1, widths: [400, 800] })}
          sizes="(min-width: 1024px) 25vw, 50vw"
          alt={product.image.alt}
          loading="lazy"
          className="aspect-square w-full rounded-lg bg-muted object-cover"
        />
      ) : null}
      <div className="flex flex-wrap gap-1">
        {soldOut ? (
          <StatusBadge kind="outOfStock" />
        ) : upcoming ? null : (
          <StatusBadge kind="flashSale" />
        )}
        {deal.remaining !== null ? <StatusBadge kind="lowStock" count={deal.remaining} /> : null}
      </div>
      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        search={{ variant: deal.sku }}
        className="font-semibold after:absolute after:inset-0 hover:underline"
      >
        {product.name}
      </Link>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-xl font-semibold tabular-nums">{formatInr(deal.salePricePaise)}</span>
        <span className="text-sm text-ink-muted">
          normally <span className="line-through">{formatInr(deal.regularPricePaise)}</span>
        </span>
      </p>
      {upcoming ? (
        <p className="flex items-center gap-1.5 text-sm">
          <CalendarClockIcon className="size-4 text-info" aria-hidden />
          Starts {formatDateTime(iso(deal.startsAt))}
        </p>
      ) : soldOut ? (
        <p className="text-sm text-ink-muted">
          Sold out. The sale ends {formatDateTime(iso(deal.endsAt))}.
        </p>
      ) : (
        <Countdown endsAt={iso(deal.endsAt)} label="Ends in" />
      )}
      <p className="text-xs text-ink-muted">One per customer. No cash on delivery.</p>
    </li>
  );
}

function Section({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="flex items-center gap-2 font-heading text-tagline font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Deals (D-120, D-231): live flash sales with their real end, sales starting this week, then the
 * live payment offers and coupons (`offers`, from the offers feature). No fake urgency (D-140).
 */
export function DealsPage({ offers }: { offers?: ReactNode }) {
  const query = useDealsQuery();
  useEffect(() => track('deals_view'), []);
  const grid = 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4';
  return (
    <Container className="space-y-10 py-8 sm:py-10">
      <div className="space-y-2">
        <h1 className="font-heading text-title tracking-tight">Deals</h1>
        <p className="text-ink-muted">
          Real prices, real end times, real stock. Nothing here resets or refills.
        </p>
      </div>
      {query.isError && !query.data ? (
        <ErrorState title="Couldn't load deals" onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <Skeleton className="h-72 w-full" aria-label="Loading deals" />
      ) : (
        <>
          <Section
            id="deals-live"
            title={
              <>
                <ZapIcon className="size-6 text-offer" aria-hidden />
                Flash sales
              </>
            }
          >
            {query.data.live.length ? (
              <ul className={grid}>
                {query.data.live.map((d) => (
                  <DealCard key={`${d.sku}-${d.endsAt}`} deal={d} />
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No flash sale right now"
                body={
                  query.data.upcoming.length
                    ? 'The next one is listed below.'
                    : 'Check back soon, or see the offers below.'
                }
              />
            )}
          </Section>
          {query.data.upcoming.length ? (
            <Section id="deals-upcoming" title="Coming up this week">
              <ul className={grid}>
                {query.data.upcoming.map((d) => (
                  <DealCard key={`${d.sku}-${d.startsAt}`} deal={d} />
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      )}
      {offers ? (
        <Section id="deals-offers" title="Bank offers and coupons">
          {offers}
        </Section>
      ) : null}
    </Container>
  );
}
