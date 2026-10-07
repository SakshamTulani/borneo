import { watchListSchema, type WatchList } from '@borneo/shared';
import { getJson, sendJson } from '../../../shared/lib/http';

export const getWatch = (): Promise<WatchList> => getJson('/me/watch', watchListSchema);

export const putWatch = (sku: string): Promise<WatchList> =>
  sendJson('PUT', `/me/watch/${encodeURIComponent(sku)}`, undefined, watchListSchema);

export const deleteWatch = (sku: string): Promise<WatchList> =>
  sendJson('DELETE', `/me/watch/${encodeURIComponent(sku)}`, undefined, watchListSchema);
