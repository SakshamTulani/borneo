import { useQuery } from '@tanstack/react-query';
import { finderQuery } from '../repository/finderRepository';
import type { FinderSearch } from '../model';

export function useFinderQuery(id: string, answers: FinderSearch) {
  return useQuery(finderQuery(id, answers));
}
