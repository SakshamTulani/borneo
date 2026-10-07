import { useQuery } from '@tanstack/react-query';
import { upgradeForQuery } from '../repository/upgradeRepository';

/** Only fetched when signed in. */
export function useUpgradeForQuery(slug: string, enabled: boolean) {
  return useQuery({ ...upgradeForQuery(slug), enabled });
}
