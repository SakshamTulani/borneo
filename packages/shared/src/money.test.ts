import { describe, expect, it } from 'vitest';
import { formatInr } from './money';

describe('formatInr', () => {
  it('uses Indian digit grouping and drops zero paise', () => {
    expect(formatInr(2_499_900)).toBe('₹24,999');
    expect(formatInr(124_999_900)).toBe('₹12,49,999');
  });

  it('shows paise when present', () => {
    expect(formatInr(99_950)).toBe('₹999.50');
  });

  it('rejects non-integer paise', () => {
    expect(() => formatInr(10.5)).toThrow('paise must be a safe integer');
  });
});
