import type { AnalyticsBatch } from '@borneo/shared';
import { send } from '../../../shared/lib/http';

/** Fire and forget: analytics must never break a page (D-236). */
export async function postEvents(batch: AnalyticsBatch): Promise<void> {
  try {
    await send('POST', '/events', batch);
  } catch {
    // Dropped: the shopper's page matters more than the event.
  }
}
