import { queryOptions } from '@tanstack/react-query';
import { getUpgradeFor, getUpgradeStrip } from '../api/upgradeApi';

/** Under `['me']`: personal, dropped when the session changes (D-121). */
export const upgradeStripQuery = queryOptions({
  queryKey: ['me', 'upgrades'],
  queryFn: getUpgradeStrip,
  staleTime: 60_000,
});

export const upgradeForQuery = (slug: string) =>
  queryOptions({
    queryKey: ['me', 'upgrades', slug],
    queryFn: () => getUpgradeFor(slug),
    staleTime: 60_000,
  });
