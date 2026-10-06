import { describe, expect, it } from 'vitest';
import { addIstDays, endOfIstDayAfter, istDate } from './time';

describe('IST time', () => {
  it('D-01: dates are India calendar dates', () => {
    expect(istDate(Date.parse('2026-10-06T18:29:59Z'))).toBe('2026-10-06');
    expect(istDate(Date.parse('2026-10-06T18:30:00Z'))).toBe('2026-10-07');
    expect(addIstDays(Date.parse('2026-10-06T06:30:00Z'), 3)).toBe('2026-10-09');
  });

  it('D-87: end of the Nth IST day after a moment', () => {
    const end = endOfIstDayAfter(Date.parse('2026-10-06T20:00:00Z'), 7); // 7 Oct 01:30 IST
    expect(new Date(end).toISOString()).toBe('2026-10-14T18:29:59.999Z'); // 14 Oct 23:59:59.999 IST
  });
});
