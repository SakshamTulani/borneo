import { BadgePercentIcon, CreditCardIcon, TicketIcon, type LucideIcon } from 'lucide-react';
import { useLiveOffersQuery } from '../hooks/useLiveOffersQuery';
import type { OfferTile } from '../model';

const ICON: Record<Exclude<OfferTile['kind'], 'flash'>, LucideIcon> = {
  bank: CreditCardIcon,
  noCostEmi: BadgePercentIcon,
  coupon: TicketIcon,
};

/** Live payment offers and coupons with their real terms, as a still grid (D-191, D-231). */
export function OfferList() {
  const { data } = useLiveOffersQuery();
  const offers = (data ?? []).filter(
    (o): o is OfferTile & { kind: Exclude<OfferTile['kind'], 'flash'> } => o.kind !== 'flash',
  );
  if (offers.length === 0) return null;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {offers.map((o) => {
        const Icon = ICON[o.kind];
        return (
          <li key={o.id} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-offer-soft text-offer"
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-semibold tracking-wide text-offer uppercase">{o.label}</p>
              <p className="font-semibold">{o.title}</p>
              <p className="text-sm text-ink-muted">{o.terms}</p>
              {o.code ? (
                <p className="text-sm">
                  Code <span className="font-mono font-semibold">{o.code}</span>
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
