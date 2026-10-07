import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { getFinder } from '../api/finderApi';
import type { FinderSearch } from '../model';

/** The finder at these answers (D-225); public, so cached like listings. */
export const finderQuery = (id: string, answers: FinderSearch) =>
  queryOptions({
    queryKey: ['finder', id, answers],
    queryFn: () => getFinder(id, answers),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

/** URL search → answers: only plain text values (the API checks them against the options). */
export function parseFinderSearch(raw: Record<string, unknown>): FinderSearch {
  const out: FinderSearch = {};
  for (const [k, v] of Object.entries(raw))
    if (/^[a-z]+$/.test(k) && (typeof v === 'string' || typeof v === 'number')) out[k] = String(v);
  return out;
}
