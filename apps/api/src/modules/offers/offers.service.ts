import {
  dealsSections,
  offerStrip,
  UPCOMING_FLASH_WINDOW_MS,
  type DealsView,
  type FlashListing,
  type OfferStrip,
  type ProductSummary,
} from '@borneo/shared';
import type { DealRow, OfferBook } from './offers.repository';

/** `Row` is the catalog's listing row, passed through untouched (no import, no module cycle). */
export type OffersDeps<Row = unknown> = {
  now: () => number;
  loadOfferBook: (at: number) => Promise<OfferBook>;
  listFlashListings: (at: number) => Promise<FlashListing[]>;
  listFlashForDeals: (at: number, until: number) => Promise<DealRow[]>;
  listProducts: (ids: string[]) => Promise<Row[]>;
  summarize: (rows: Row[]) => Promise<ProductSummary[]>;
};

export function createOffersService<Row>(deps: OffersDeps<Row>) {
  return {
    /** The home strip of live offers (D-191). */
    async live(): Promise<OfferStrip> {
      const now = deps.now();
      const [book, flash] = await Promise.all([
        deps.loadOfferBook(now),
        deps.listFlashListings(now),
      ]);
      return { items: offerStrip({ ...book, flash, now }) };
    },

    /** Live and upcoming flash sales (D-140, D-148, D-231). */
    async deals(): Promise<DealsView> {
      const now = deps.now();
      const rows = await deps.listFlashForDeals(now, now + UPCOMING_FLASH_WINDOW_MS);
      const { live, upcoming } = dealsSections(rows, now);
      const listed = await deps.listProducts([...new Set(rows.map((r) => r.productId))]);
      const cards = new Map((await deps.summarize(listed)).map((c) => [c.id, c]));
      const deal = (r: (typeof live)[number] | (typeof upcoming)[number]) => {
        const product = cards.get(r.productId);
        return product
          ? [
              {
                product,
                sku: r.sku,
                salePricePaise: r.sale.salePricePaise,
                regularPricePaise: r.regularPricePaise,
                startsAt: r.sale.startsAt,
                endsAt: r.sale.endsAt,
                state: r.state,
                remaining: 'remaining' in r ? r.remaining : null,
              },
            ]
          : [];
      };
      return { live: live.flatMap(deal), upcoming: upcoming.flatMap(deal) };
    },
  };
}

export type OffersService = ReturnType<typeof createOffersService<unknown>>;
