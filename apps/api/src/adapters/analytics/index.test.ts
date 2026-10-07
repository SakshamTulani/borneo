import { describe, expect, it } from 'vitest';
import { createLogAnalytics } from './index';

describe('analytics adapter', () => {
  it('D-236: writes each event to the log as data, nothing else', () => {
    const lines: object[] = [];
    const analytics = createLogAnalytics({ info: (obj) => void lines.push(obj) });
    analytics.track([
      {
        name: 'search',
        props: { query: 'earbuds' },
        at: 1,
        source: 'web',
        anonymousId: 'abcdefgh',
      },
    ]);
    expect(lines).toEqual([
      {
        analytics: {
          name: 'search',
          props: { query: 'earbuds' },
          at: 1,
          source: 'web',
          anonymousId: 'abcdefgh',
        },
      },
    ]);
  });
});
