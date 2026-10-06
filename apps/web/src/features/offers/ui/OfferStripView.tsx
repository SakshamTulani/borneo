import { Link } from '@tanstack/react-router';
import {
  BadgePercentIcon,
  CreditCardIcon,
  TicketIcon,
  ZapIcon,
  type LucideIcon,
} from 'lucide-react';
import { Container } from '@/shared/ui/layout/Container';
import type { OfferTile } from '../model';

const ICON: Record<OfferTile['kind'], LucideIcon> = {
  flash: ZapIcon,
  bank: CreditCardIcon,
  noCostEmi: BadgePercentIcon,
  coupon: TicketIcon,
};

const tile =
  'flex h-full w-72 shrink-0 snap-start items-start gap-3 rounded-2xl border border-line bg-surface p-4 sm:w-80';

/**
 * Live offers under the home hero (D-191): real terms and end times, nothing upcoming or sold
 * out, no countdown pressure (D-06). Hidden when nothing is live.
 */
export function OfferStripView({ offers }: { offers: OfferTile[] }) {
  if (offers.length === 0) return null;
  return (
    <section aria-labelledby="home-offers" className="bg-canvas pt-8 sm:pt-10">
      <Container>
        <h2 id="home-offers" className="mb-3 text-[15px] font-semibold">
          Offers running now
        </h2>
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
          {offers.map((o) => (
            <li key={o.id} className="flex">
              {o.product ? (
                <Link
                  to="/products/$slug"
                  params={{ slug: o.product.slug }}
                  search={{ variant: o.product.sku }}
                  className={`${tile} outline-none hover:border-line-strong focus-visible:outline-2 focus-visible:outline-brand`}
                >
                  <TileBody offer={o} />
                </Link>
              ) : (
                <div className={tile}>
                  <TileBody offer={o} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function TileBody({ offer }: { offer: OfferTile }) {
  const Icon = ICON[offer.kind];
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-offer-soft text-offer">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 space-y-0.5">
        <span className="block text-xs font-semibold text-offer">{offer.label}</span>
        <span className="block leading-snug font-semibold">{offer.title}</span>
        <span className="block text-sm text-ink-muted">{offer.terms}</span>
        {offer.code ? (
          <span className="mt-1 inline-block rounded-md border border-dashed border-offer px-2 py-0.5 font-mono text-sm text-offer">
            <span className="sr-only">Code </span>
            {offer.code}
          </span>
        ) : null}
      </span>
    </>
  );
}
