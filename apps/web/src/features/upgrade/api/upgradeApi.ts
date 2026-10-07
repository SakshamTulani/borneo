import {
  upgradeForProductSchema,
  upgradeStripSchema,
  type UpgradeForProduct,
  type UpgradeStripView,
} from '@borneo/shared';
import { getJson } from '../../../shared/lib/http';

export const getUpgradeStrip = (): Promise<UpgradeStripView> =>
  getJson('/me/upgrades', upgradeStripSchema);

export const getUpgradeFor = (slug: string): Promise<UpgradeForProduct> =>
  getJson(`/me/upgrades/${encodeURIComponent(slug)}`, upgradeForProductSchema);
