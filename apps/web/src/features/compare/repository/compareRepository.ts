import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { COMPARE_MAX } from '@borneo/shared';
import { getCompare } from '../api/compareApi';

/** Products side by side within a category (D-122, D-227). Public, cached like listings. */
export const compareQuery = (category: string, slugs: string[]) =>
  queryOptions({
    queryKey: ['compare', category, slugs],
    queryFn: () => getCompare(category, slugs),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

/** `?p=a,b,c` → at most 4 distinct slugs (D-122). */
export function parseCompareSearch(raw: Record<string, unknown>): { p: string } {
  const slugs = String(raw.p ?? '')
    .split(',')
    .filter((s) => /^[a-z0-9-]+$/.test(s));
  return { p: [...new Set(slugs)].slice(0, COMPARE_MAX).join(',') };
}
