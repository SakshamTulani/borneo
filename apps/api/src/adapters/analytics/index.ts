import type { AnalyticsEventName } from '@borneo/shared';

/** One recorded event: from a browser (anonymous id) or from the API itself. */
export type TrackedEvent = {
  name: AnalyticsEventName | 'order_placed';
  props: Record<string, string | number | boolean>;
  at: number;
  source: 'web' | 'api';
  anonymousId?: string;
};

/** Analytics port (ADR-0003, D-163). Implementations must never receive personal data (D-236). */
export type Analytics = { track(events: TrackedEvent[]): void };

/** Console + log (D-163): one JSON line per event, until a provider is chosen (blocker). */
export function createLogAnalytics(log: { info(obj: object, msg: string): void }): Analytics {
  return {
    track(events) {
      for (const e of events) log.info({ analytics: e }, 'analytics event');
    },
  };
}
