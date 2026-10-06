import { AppError } from '../errors';

export type RateRule = { max: number; windowMs: number };

/**
 * Fixed-window counters kept in memory (one API process in the demo). Keys are built by the
 * route, e.g. `sign-in:<ip>:<email>`. A multi-instance deploy needs a shared store.
 */
export function createRateLimiter(now: () => number = Date.now, maxKeys = 50_000) {
  const windows = new Map<string, { start: number; count: number; windowMs: number }>();

  return {
    /** Counts one attempt; throws 429 RATE_LIMITED with Retry-After seconds when over the rule. */
    hit(key: string, rule: RateRule): void {
      const t = now();
      const w = windows.get(key);
      if (!w || t - w.start >= rule.windowMs) {
        if (windows.size >= maxKeys) prune(t);
        windows.set(key, { start: t, count: 1, windowMs: rule.windowMs });
        return;
      }
      w.count += 1;
      if (w.count > rule.max) {
        const retryAfter = Math.ceil((w.start + rule.windowMs - t) / 1000);
        throw new AppError(429, 'RATE_LIMITED', 'Too many attempts. Try again later.', {
          retryAfterSeconds: retryAfter,
        });
      }
    },
  };

  /** Drops finished windows (each by its own length); if still full, the oldest go first. */
  function prune(t: number) {
    for (const [key, w] of windows) if (t - w.start >= w.windowMs) windows.delete(key);
    for (const key of windows.keys()) {
      if (windows.size < maxKeys) break;
      windows.delete(key);
    }
  }
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
