import { useQuery } from '@tanstack/react-query';
import { searchResultsQuery } from '../repository/searchRepository';

export function useSearchResultsQuery(q: string) {
  return useQuery({ ...searchResultsQuery(q), enabled: q.length > 0 });
}
