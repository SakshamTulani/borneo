import { describe, expect, it } from 'vitest';
import { emiFrom, emiInterest, emiMonthly } from './emi';

const plans = [
  { id: 'p3', bank: 'DemoBank', tenureMonths: 3, annualRateBps: 1500, minAmountPaise: 300_000 },
  { id: 'p12', bank: 'DemoBank', tenureMonths: 12, annualRateBps: 1500, minAmountPaise: 1_000_000 },
];

describe('EMI', () => {
  it('D-33: reducing-balance instalment, rounded to the paisa', () => {
    expect(emiMonthly(2_499_900, 12, 1500)).toBe(225_637);
    expect(emiMonthly(1_000, 3, 0)).toBe(333);
  });

  it('D-45: interest is what the plan charges in total', () => {
    expect(emiInterest(2_499_900, 12, 1500)).toBe(225_637 * 12 - 2_499_900);
    expect(emiInterest(2_499_900, 6, 0)).toBe(0);
  });

  it('D-47: "from" is the lowest instalment among plans available at that amount', () => {
    expect(emiFrom(2_499_900, plans)).toBe(225_637);
    expect(emiFrom(500_000, plans)).toBe(170_851); // 12-month plan needs ₹10,000
    expect(emiFrom(100_000, plans)).toBeUndefined();
  });

  it('D-47: a live no-cost offer makes its plan interest-free', () => {
    expect(emiFrom(2_499_900, plans, new Set(['p12']))).toBe(208_325);
  });
});
