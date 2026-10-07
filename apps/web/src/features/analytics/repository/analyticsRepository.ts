import { postEvents } from '../api/analyticsApi';
import type { AnalyticsEvent, AnalyticsEventName, EventProps } from '../model';

const KEY = 'borneo.anonymousId';
const FLUSH_MS = 2_000;
let queue: AnalyticsEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

/** A random id kept in this browser only; never tied to the account (D-236). */
function anonymousId(): string {
  try {
    const known = localStorage.getItem(KEY);
    if (known) return known;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return 'no-storage-0000';
  }
}

function flush() {
  timer = undefined;
  while (queue.length) {
    const events = queue.slice(0, 20);
    queue = queue.slice(20);
    void postEvents({ anonymousId: anonymousId(), events });
  }
}

/**
 * Records a product event (D-236). Browser only: call from effects and event handlers, never
 * during render. Batched every 2 seconds and when the page is hidden.
 */
export function track(name: AnalyticsEventName, props: EventProps = {}) {
  if (typeof window === 'undefined') return;
  queue.push({ name, props, at: Date.now() });
  timer ??= setTimeout(flush, FLUSH_MS);
}

if (typeof window !== 'undefined')
  window.addEventListener('pagehide', () => {
    if (timer) clearTimeout(timer);
    flush();
  });
