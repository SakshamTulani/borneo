import { offerStrip, type FlashListing, type OfferStrip } from '@borneo/shared';
import type { OfferBook } from './offers.repository';

export type OffersDeps = {
  now: () => number;
  loadOfferBook: (at: number) => Promise<OfferBook>;
  listFlashListings: (at: number) => Promise<FlashListing[]>;
};

export function createOffersService(deps: OffersDeps) {
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
  };
}

export type OffersService = ReturnType<typeof createOffersService>;
