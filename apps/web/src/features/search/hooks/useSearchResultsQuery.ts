import { useInfiniteQuery } from '@tanstack/react-query';
import { searchResultsQuery } from '../repository/searchRepository';

export function useSearchResultsQuery(q: string) {
  return useInfiniteQuery({ ...searchResultsQuery(q), enabled: q.length > 0 });
}
