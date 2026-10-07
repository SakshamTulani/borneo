import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import type { TrackedEvent } from '../../adapters/analytics/index';
import { fakeAppDeps } from '../../test/factories';
import { createAnalyticsService } from './analytics.service';

function app() {
  const seen: TrackedEvent[] = [];
  const a = buildApp(
    fakeAppDeps({
      analytics: createAnalyticsService({ analytics: { track: (e) => void seen.push(...e) } }),
    }),
  );
  return { a, seen };
}
const batch = (n: number, name = 'search') => ({
  anonymousId: 'device-12345678',
  events: Array.from({ length: n }, (_, i) => ({ name, props: { query: 'earbuds' }, at: i })),
});
const post = (a: ReturnType<typeof app>['a'], payload: object) =>
  a.inject({ method: 'POST', url: '/events', payload });

describe('POST /events', () => {
  it('D-236: records known events with the device id and nothing about the person', async () => {
    const { a, seen } = app();
    const res = await post(a, batch(2));
    expect(res.statusCode).toBe(204);
    expect(seen).toEqual([
      {
        name: 'search',
        props: { query: 'earbuds' },
        at: 0,
        source: 'web',
        anonymousId: 'device-12345678',
      },
      {
        name: 'search',
        props: { query: 'earbuds' },
        at: 1,
        source: 'web',
        anonymousId: 'device-12345678',
      },
    ]);
  });

  it('D-236: unknown events, long values and big batches are refused', async () => {
    const { a, seen } = app();
    expect((await post(a, batch(1, 'card_number'))).statusCode).toBe(400);
    expect((await post(a, batch(21))).statusCode).toBe(400);
    expect(
      (
        await post(a, {
          anonymousId: 'device-12345678',
          events: [{ name: 'search', props: { query: 'x'.repeat(81) }, at: 0 }],
        })
      ).statusCode,
    ).toBe(400);
    expect(seen).toEqual([]);
  });

  it('D-236: at most 60 events a minute from one address', async () => {
    const { a } = app();
    for (let i = 0; i < 3; i++) expect((await post(a, batch(20))).statusCode).toBe(204);
    expect((await post(a, batch(1))).statusCode).toBe(429);
  });
});
