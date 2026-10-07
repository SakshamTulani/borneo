import type { AnalyticsBatch } from '@borneo/shared';
import type { Analytics } from '../../adapters/analytics/index';

export type AnalyticsDeps = { analytics: Analytics };

/** Browser events, recorded as given: the contract already keeps out personal data (D-236). */
export function createAnalyticsService(deps: AnalyticsDeps) {
  return {
    record(batch: AnalyticsBatch) {
      deps.analytics.track(
        batch.events.map((e) => ({ ...e, source: 'web' as const, anonymousId: batch.anonymousId })),
      );
    },
  };
}

export type AnalyticsService = ReturnType<typeof createAnalyticsService>;
