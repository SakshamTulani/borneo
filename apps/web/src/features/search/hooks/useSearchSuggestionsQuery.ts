import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { searchSuggestionsQuery } from '../repository/searchRepository';

/** Suggestions from 2 characters; the previous list stays while the next one loads. */
export const MIN_SUGGEST_LENGTH = 2;

export function useSearchSuggestionsQuery(q: string) {
  return useQuery({
    ...searchSuggestionsQuery(q),
    enabled: q.length >= MIN_SUGGEST_LENGTH,
    placeholderData: keepPreviousData,
  });
}
