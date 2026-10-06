/** Money is integer paise (ADR-0006). Formatting is the only place rupees appear. */
export type Paise = number;

export function formatInr(paise: Paise): string {
  if (!Number.isSafeInteger(paise)) throw new Error(`paise must be a safe integer, got ${paise}`);
  const digits = paise % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(paise / 100);
}
