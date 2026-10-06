import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  BadgePercentIcon,
  CreditCardIcon,
  PauseIcon,
  PlayIcon,
  TicketIcon,
  ZapIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { OfferTile } from '../model';

const ICON: Record<OfferTile['kind'], LucideIcon> = {
  flash: ZapIcon,
  bank: CreditCardIcon,
  noCostEmi: BadgePercentIcon,
  coupon: TicketIcon,
};

/** Seconds per offer for one pass of the band, so a long list doesn't race. */
const SECONDS_PER_OFFER = 9;

/**
 * Live offers under the home hero as a moving ticker (D-191, owner request): real terms and end
 * times, nothing upcoming or sold out, no countdown pressure (D-06). It pauses on hover and while
 * anything in it has keyboard focus, has a Pause button (WCAG 2.2.2), and stands still for people
 * who ask for reduced motion (then it scrolls by hand). Hidden when nothing is live.
 */
export function OfferStripView({ offers }: { offers: OfferTile[] }) {
  const [paused, setPaused] = useState(false);
  if (offers.length === 0) return null;
  const duration = `${Math.max(30, offers.length * SECONDS_PER_OFFER)}s`;
  return (
    <section aria-labelledby="home-offers" className="border-y border-line bg-offer-soft">
      <div className="flex items-stretch">
        <h2
          id="home-offers"
          className="flex shrink-0 items-center bg-offer px-4 text-sm font-semibold text-surface sm:px-6"
        >
          Offers now
        </h2>
        <div className="group relative min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto">
          <div
            className={cn(
              'flex w-max animate-[borneo-ticker_linear_infinite] group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none',
              paused && '[animation-play-state:paused]',
            )}
            style={{ animationDuration: duration }}
          >
            <TickerRun offers={offers} />
            {/* The second copy only makes the loop seamless; assistive tech and Tab skip it. */}
            <TickerRun offers={offers} copy />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center border-l border-line bg-offer-soft text-offer hover:bg-surface motion-reduce:hidden"
        >
          {paused ? (
            <PlayIcon className="size-4" aria-hidden />
          ) : (
            <PauseIcon className="size-4" aria-hidden />
          )}
          <span className="sr-only">Pause offers</span>
        </button>
      </div>
    </section>
  );
}

function TickerRun({ offers, copy = false }: { offers: OfferTile[]; copy?: boolean }) {
  return (
    <ul
      className={cn('flex shrink-0 items-center', copy && 'motion-reduce:hidden')}
      aria-hidden={copy || undefined}
    >
      {offers.map((o) => (
        <li key={o.id} className="flex items-center border-r border-offer/20">
          {o.product ? (
            <Link
              to="/products/$slug"
              params={{ slug: o.product.slug }}
              search={{ variant: o.product.sku }}
              tabIndex={copy ? -1 : undefined}
              className="flex min-h-11 items-center gap-2 px-5 py-2 text-sm underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            >
              <TickerItem offer={o} />
            </Link>
          ) : (
            <span className="flex min-h-11 items-center gap-2 px-5 py-2 text-sm">
              <TickerItem offer={o} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function TickerItem({ offer }: { offer: OfferTile }) {
  const Icon = ICON[offer.kind];
  return (
    <>
      <Icon className="size-4 shrink-0 text-offer" aria-hidden />
      <span className="font-semibold whitespace-nowrap text-offer">{offer.label}:</span>
      <span className="font-semibold whitespace-nowrap">{offer.title}</span>
      {offer.code ? (
        <span className="rounded-md border border-dashed border-offer px-1.5 font-mono text-xs whitespace-nowrap text-offer">
          <span className="sr-only">Code </span>
          {offer.code}
        </span>
      ) : null}
      <span className="whitespace-nowrap text-ink-muted">{offer.terms}</span>
    </>
  );
}
