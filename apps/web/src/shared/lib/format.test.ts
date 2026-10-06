import { describe, expect, it } from 'vitest';
import { formatDateRange, formatDuration } from './format';

describe('format', () => {
  it('formats a delivery range in India time', () => {
    expect(formatDateRange('2026-10-09T06:00:00Z', '2026-10-11T06:00:00Z')).toBe(
      'Fri, 9 – Sun, 11 Oct',
    );
  });

  it('formats durations', () => {
    expect(formatDuration(4 * 3600_000 + 12 * 60_000 + 9_000)).toBe('04:12:09');
    expect(formatDuration(28 * 3600_000 + 12 * 60_000)).toBe('1d 04h 12m');
    expect(formatDuration(-5)).toBe('00:00:00');
  });
});
