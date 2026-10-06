import type { EmiPlan } from '../contracts/catalog';
import { divideHalfUp, type Paise } from '../money';

/** Monthly instalment on a reducing balance, rounded half up to paise. Zero rate = equal split. */
export function emiMonthly(principal: Paise, tenureMonths: number, annualRateBps: number): Paise {
  if (annualRateBps === 0) return divideHalfUp(principal, tenureMonths);
  const r = annualRateBps / 10_000 / 12;
  const factor = (1 + r) ** tenureMonths;
  return Math.floor((principal * r * factor) / (factor - 1) + 0.5);
}

/**
 * Total interest a plan charges. No-cost EMI discounts exactly this upfront; the bank charges
 * interest on the reduced amount, so the customer repays the original price ÷ months (D-45).
 * Instalment amounts use a float power term, then round half up to the paisa (D-47).
 */
export function emiInterest(principal: Paise, tenureMonths: number, annualRateBps: number): Paise {
  if (annualRateBps === 0) return 0;
  return Math.max(0, emiMonthly(principal, tenureMonths, annualRateBps) * tenureMonths - principal);
}

/**
 * "from ₹X/mo" (D-33): the lowest monthly instalment among plans available at this
 * amount (D-47). `noCostPlanIds` are plans made interest-free by a live no-cost EMI offer.
 */
export function emiFrom(
  amount: Paise,
  plans: EmiPlan[],
  noCostPlanIds: ReadonlySet<string> = new Set(),
): Paise | undefined {
  const monthly = plans
    .filter((p) => amount >= p.minAmountPaise)
    .map((p) => emiMonthly(amount, p.tenureMonths, noCostPlanIds.has(p.id) ? 0 : p.annualRateBps));
  return monthly.length ? Math.min(...monthly) : undefined;
}
