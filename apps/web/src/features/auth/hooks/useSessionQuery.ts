import { useQuery } from '@tanstack/react-query';
import { sessionQuery } from '../repository/authRepository';

export function useSessionQuery() {
  return useQuery(sessionQuery);
}
