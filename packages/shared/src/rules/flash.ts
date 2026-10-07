import type { FlashSale } from '../contracts/offers';
import type { Paise } from '../money';

export type FlashState = 'upcoming' | 'live' | 'soldOut' | 'ended';

/** Real urgency only: state comes from the real window and the real cap (D-140). */
export function flashState(sale: FlashSale, now: number): FlashState {
  if (now < sale.startsAt) return 'upcoming';
  if (now >= sale.endsAt) return 'ended';
  return sale.sold >= sale.cap ? 'soldOut' : 'live';
}

/** Flash price only while live; the price returns to normal afterwards (D-140). */
export function unitPriceWithFlash(
  regularPaise: Paise,
  sale: FlashSale | undefined,
  now: number,
): { paise: Paise; source: 'regular' | 'flash' } {
  return sale && flashState(sale, now) === 'live'
    ? { paise: sale.salePricePaise, source: 'flash' }
    : { paise: regularPaise, source: 'regular' };
}

export const LOW_STOCK_THRESHOLD = 5;

/** "Only N left" from the real remaining cap, only at or below the threshold (D-140, D-148). */
export function lowStockCount(sale: FlashSale, now: number): number | undefined {
  if (flashState(sale, now) !== 'live') return undefined;
  const remaining = sale.cap - sale.sold;
  return remaining <= LOW_STOCK_THRESHOLD ? remaining : undefined;
}

export type FlashPurchaseBlock =
  'NOT_STARTED' | 'ENDED' | 'SOLD_OUT' | 'LIMIT_REACHED' | 'QTY_OVER_LIMIT' | 'DISPOSABLE_EMAIL';

/**
 * Can this customer buy? Limit 1 per customer, checked on email only (D-142);
 * disposable email domains blocked (D-143). The account requirement is enforced by the route.
 */
export function canBuyFlash(input: {
  sale: FlashSale;
  now: number;
  qty: number;
  alreadyBought: number;
  email: string;
  disposableDomains: ReadonlySet<string>;
}): { ok: true } | { ok: false; reason: FlashPurchaseBlock } {
  const { sale, now, qty, alreadyBought, email, disposableDomains } = input;
  const state = flashState(sale, now);
  if (state === 'upcoming') return { ok: false, reason: 'NOT_STARTED' };
  if (state === 'ended') return { ok: false, reason: 'ENDED' };
  if (state === 'soldOut') return { ok: false, reason: 'SOLD_OUT' };
  if (isDisposableEmail(email, disposableDomains)) return { ok: false, reason: 'DISPOSABLE_EMAIL' };
  if (alreadyBought >= sale.perCustomerLimit) return { ok: false, reason: 'LIMIT_REACHED' };
  if (alreadyBought + qty > sale.perCustomerLimit) return { ok: false, reason: 'QTY_OVER_LIMIT' };
  return { ok: true };
}

/** D-143. Matches the domain and any parent domain on the blocklist. */
export function isDisposableEmail(email: string, domains: ReadonlySet<string>): boolean {
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  const parts = domain.split('.');
  return parts.some((_, i) => domains.has(parts.slice(i).join('.')));
}

/** Flash checkout attempts per customer and per address, each (D-143, D-230). */
export const FLASH_CHECKOUT_LIMIT = { max: 5, windowMs: 10 * 60_000 };

/** How far ahead the deals page lists sales that haven't started (D-231). */
export const UPCOMING_FLASH_WINDOW_MS = 7 * 86_400_000;

/**
 * The deals page (D-140, D-231): live sales ending soonest first (sold-out ones stay, marked, until
 * they end), then sales starting within 7 days, soonest first. Ended sales never show. "Only N
 * left" comes from the real remaining cap at 5 or fewer (D-148); no countdown resets (it is the
 * sale's own end).
 */
export function dealsSections<T extends { sale: FlashSale }>(
  listings: T[],
  now: number,
): {
  live: (T & { state: 'live' | 'soldOut'; remaining: number | null })[];
  upcoming: (T & { state: 'upcoming' })[];
} {
  const live = listings
    .flatMap((l) => {
      const state = flashState(l.sale, now);
      if (state !== 'live' && state !== 'soldOut') return [];
      return [{ ...l, state, remaining: lowStockCount(l.sale, now) ?? null }];
    })
    .sort((a, b) => a.sale.endsAt - b.sale.endsAt);
  const upcoming = listings
    .filter(
      (l) =>
        flashState(l.sale, now) === 'upcoming' && l.sale.startsAt - now <= UPCOMING_FLASH_WINDOW_MS,
    )
    .map((l) => ({ ...l, state: 'upcoming' as const }))
    .sort((a, b) => a.sale.startsAt - b.sale.startsAt);
  return { live, upcoming };
}
