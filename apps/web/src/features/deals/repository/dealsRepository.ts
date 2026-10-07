import { queryOptions } from '@tanstack/react-query';
import { getDeals } from '../api/dealsApi';
import type { DealsView } from '../model';

/**
 * Live and upcoming flash sales (D-231). Refetched when the next sale starts or ends, so a timer
 * reaching zero is followed by the real state (D-140).
 */
export const dealsQuery = queryOptions({
  queryKey: ['deals'],
  queryFn: getDeals,
  staleTime: 15_000,
  refetchInterval: (q) => {
    const view = q.state.data as DealsView | undefined;
    if (!view) return false;
    const times = [...view.live.map((d) => d.endsAt), ...view.upcoming.map((d) => d.startsAt)];
    const next = Math.min(...times.filter((t) => t > Date.now()));
    return Number.isFinite(next) ? Math.max(5_000, next - Date.now() + 1_000) : false;
  },
});
