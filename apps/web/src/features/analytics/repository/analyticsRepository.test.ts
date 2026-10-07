import { afterEach, describe, expect, it, vi } from 'vitest';
import { sentTo, stubApi } from '@/test/api';
import { track } from './analyticsRepository';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('analytics client', () => {
  it('D-236: batches events with a device id and sends them together', async () => {
    vi.useFakeTimers();
    const api = stubApi({ 'POST /events': [204] });
    track('search', { query: 'earbuds', results: 4 });
    track('deals_view');
    expect(sentTo(api, 'POST /events')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(2_000);
    const [batch] = sentTo(api, 'POST /events') as {
      anonymousId: string;
      events: { name: string; props: object }[];
    }[];
    expect(batch!.anonymousId).toMatch(/^[a-z0-9-]{8,64}$/);
    expect(batch!.events.map((e) => [e.name, e.props])).toEqual([
      ['search', { query: 'earbuds', results: 4 }],
      ['deals_view', {}],
    ]);
  });

  it('D-236: a failed send never reaches the page', async () => {
    vi.useFakeTimers();
    stubApi({ 'POST /events': [500] });
    track('deals_view');
    await expect(vi.advanceTimersByTimeAsync(2_000)).resolves.not.toThrow();
  });
});
