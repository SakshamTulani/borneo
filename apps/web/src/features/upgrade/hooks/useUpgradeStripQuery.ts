import { useQuery } from '@tanstack/react-query';
import { upgradeStripQuery } from '../repository/upgradeRepository';

/** Only fetched when signed in. */
export function useUpgradeStripQuery(enabled: boolean) {
  return useQuery({ ...upgradeStripQuery, enabled });
}
