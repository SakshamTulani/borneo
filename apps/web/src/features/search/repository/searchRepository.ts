import { queryOptions } from '@tanstack/react-query';
import { getSearch } from '../api/searchApi';
import { toSearchView, toSuggestions } from '../mappers/toSearchView';

export const RESULTS_LIMIT = 24;
export const SUGGESTIONS_LIMIT = 5;

/** The results page for a query (D-110–114). */
export const searchResultsQuery = (q: string) =>
  queryOptions({
    queryKey: ['search', 'results', q],
    queryFn: async () => toSearchView(await getSearch(q, RESULTS_LIMIT)),
    staleTime: 30_000,
  });

/** Instant suggestions while typing (D-112). */
export const searchSuggestionsQuery = (q: string) =>
  queryOptions({
    queryKey: ['search', 'suggestions', q],
    queryFn: async () => toSuggestions(await getSearch(q, SUGGESTIONS_LIMIT)),
    staleTime: 30_000,
  });
