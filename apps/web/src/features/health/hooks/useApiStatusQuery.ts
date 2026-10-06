import { useQuery } from '@tanstack/react-query';
import { apiStatusQuery } from '../repository/healthRepository';

export function useApiStatusQuery() {
  return useQuery(apiStatusQuery);
}
