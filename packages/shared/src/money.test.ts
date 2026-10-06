import { describe, expect, it } from 'vitest';
import { allocate, divideHalfUp, formatInr, percentOf } from './money';

describe('money', () => {
  it('D-41: formats integer paise with Indian grouping', () => {
    expect(formatInr(2_499_900)).toBe('₹24,999');
    expect(formatInr(124_999_900)).toBe('₹12,49,999');
    expect(formatInr(99_950)).toBe('₹999.50');
  });

  it('D-41: rejects non-integer paise', () => {
    expect(() => formatInr(10.5)).toThrow('paise must be a safe integer');
  });

  it('D-46: percentages round half up to the paisa', () => {
    expect(percentOf(1_005, 5_000)).toBe(503); // 502.5 → 503
    expect(percentOf(1_004, 5_000)).toBe(502);
    expect(percentOf(999_999_999_999, 1)).toBe(100_000_000); // exact, no float drift
  });

  it('D-46: division rounds half up', () => {
    expect(divideHalfUp(1_000, 3)).toBe(333);
    expect(divideHalfUp(1_001, 2)).toBe(501);
  });

  it('D-46: allocation floors each share and puts the remainder on the last weighted line', () => {
    expect(allocate(100, [100, 100, 100])).toEqual([33, 33, 34]);
    expect(allocate(100, [50, 50, 0])).toEqual([50, 50, 0]);
    expect(allocate(5, [0, 3, 0, 3, 0])).toEqual([0, 2, 0, 3, 0]);
    expect(allocate(0, [0, 0])).toEqual([0, 0]);
  });

  it('D-46: no line gets more than its own value; the remainder spills backwards', () => {
    expect(allocate(6, [3, 3, 1])).toEqual([2, 3, 1]);
    expect(allocate(7, [3, 3, 1])).toEqual([3, 3, 1]);
  });

  it('D-46: rejects totals above the weights and negative weights', () => {
    expect(() => allocate(5, [0, 0])).toThrow('more than the sum');
    expect(() => allocate(1, [2, -1])).toThrow('non-negative');
    expect(() => divideHalfUp(10, 0)).toThrow('positive integer');
  });
});
