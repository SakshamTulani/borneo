import { describe, expect, it } from 'vitest';
import { AppError } from '../errors';
import { createRateLimiter } from './rateLimit';

describe('rate limiter', () => {
  it('D-190: allows max attempts per window, then 429 with the seconds left', () => {
    let t = 0;
    const limiter = createRateLimiter(() => t);
    const rule = { max: 2, windowMs: 60_000 };
    limiter.hit('k', rule);
    limiter.hit('k', rule);
    t = 15_000;
    let error: unknown;
    try {
      limiter.hit('k', rule);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMITED',
      details: { retryAfterSeconds: 45 },
    });
    // Other keys have their own window; a new window starts fresh.
    expect(() => limiter.hit('other', rule)).not.toThrow();
    t = 60_000;
    expect(() => limiter.hit('k', rule)).not.toThrow();
  });
});

describe('rate limiter memory', () => {
  it('pruning keeps windows that are still open, each by its own length', () => {
    let t = 0;
    const limiter = createRateLimiter(() => t, 2);
    const hour = { max: 1, windowMs: 3_600_000 };
    const minute = { max: 1, windowMs: 60_000 };
    limiter.hit('signup', hour);
    t = 120_000;
    limiter.hit('a', minute); // fills the map
    t = 240_000;
    limiter.hit('b', minute); // prunes: 'a' has ended, 'signup' has not
    expect(() => limiter.hit('signup', hour)).toThrow();
  });
});
