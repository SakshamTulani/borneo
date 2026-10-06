import type { Paise } from '../money';

export type CodBlock = 'PINCODE' | 'PREORDER' | 'FLASH_SALE' | 'ORDER_VALUE';

/**
 * COD only for eligible pincodes (D-70), never for pre-orders or flash sales (D-71).
 * The order-value cap is still open (D-72): pass `capPaise` once decided.
 */
export function codEligibility(input: {
  lines: { codAllowedAtPincode: boolean; isPreorder: boolean; isFlash: boolean }[];
  orderTotalPaise: Paise;
  capPaise?: Paise;
}): { allowed: true } | { allowed: false; reasons: CodBlock[] } {
  const reasons: CodBlock[] = [];
  if (input.lines.some((l) => !l.codAllowedAtPincode)) reasons.push('PINCODE');
  if (input.lines.some((l) => l.isPreorder)) reasons.push('PREORDER');
  if (input.lines.some((l) => l.isFlash)) reasons.push('FLASH_SALE');
  if (input.capPaise !== undefined && input.orderTotalPaise > input.capPaise)
    reasons.push('ORDER_VALUE');
  return reasons.length ? { allowed: false, reasons } : { allowed: true };
}

/** Methods offered at checkout. COD only when `codEligibility` allows it (pre-orders: D-146; flash: D-71). */
export function allowedPaymentMethods(
  cod: ReturnType<typeof codEligibility>,
): ('upi' | 'card' | 'emi' | 'cod')[] {
  return cod.allowed ? ['upi', 'card', 'emi', 'cod'] : ['upi', 'card', 'emi'];
}
