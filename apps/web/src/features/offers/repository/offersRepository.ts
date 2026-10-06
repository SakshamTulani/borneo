import { queryOptions } from '@tanstack/react-query';
import { getLiveOffers } from '../api/offersApi';
import { toOfferTile } from '../mappers/toOfferTile';
import type { OfferTile } from '../model';

/** Live offers for the home strip (D-191). Short stale time: flash sales end and sell out. */
export const liveOffersQuery = queryOptions({
  queryKey: ['offers', 'live'],
  queryFn: async (): Promise<OfferTile[]> => (await getLiveOffers()).items.map(toOfferTile),
  staleTime: 30_000,
  // Drop an offer when it ends: refetch at the earliest end time (at most every 5 minutes).
  refetchInterval: (query) => {
    const ends = (query.state.data ?? []).map((o) => o.endsAt);
    if (ends.length === 0) return 5 * 60_000;
    return Math.min(5 * 60_000, Math.max(5_000, Math.min(...ends) - Date.now() + 1_000));
  },
});
