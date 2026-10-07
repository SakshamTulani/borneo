import { useQuery } from '@tanstack/react-query';
import { watchQuery } from '../repository/watchRepository';

/** Only fetched when signed in (`enabled`). */
export function useWatchQuery(enabled = true) {
  return useQuery({ ...watchQuery, enabled });
}
