import type { CartLineView, CartView } from '../model';

/** "Forest · 6 GB + 128 GB". */
export const optionsText = (options: Record<string, string>) => Object.values(options).join(' · ');

/** Why a line holds checkout (D-198). Never a stock count (D-148). */
export function lineStatusText(line: CartLineView): string | null {
  switch (line.status) {
    case 'ok':
      return null;
    case 'notEnoughStock':
      return `We can't supply ${line.qty} right now. Lower the quantity to continue.`;
    case 'outOfStock':
      return 'Out of stock. Remove it to continue.';
    case 'unavailable':
      return line.kind === 'bundle'
        ? 'This bundle is no longer on sale. Remove it to continue.'
        : 'We no longer sell this. Remove it to continue.';
  }
}

/** Delivery for one line at the cart's pincode (D-52, D-55). */
export function lineDeliveryText(
  line: CartLineView,
  formatRange: (from: string, to: string) => string,
): { text: string; ok: boolean } | null {
  const d = line.delivery;
  if (!d) return null;
  if (d.status === 'deliverable')
    return { text: `Delivery ${formatRange(d.from, d.to)}`, ok: true };
  if (d.status === 'outOfStockHere') return { text: 'Not in stock for this pincode', ok: false };
  return { text: "We don't deliver this to your pincode", ok: false };
}

const COD_REASONS = {
  PREORDER: 'pre-orders are paid online',
  FLASH_SALE: 'flash sale prices are paid online',
  PINCODE: 'not available at this pincode',
  ORDER_VALUE: 'above the cash on delivery limit',
} as const;

/** "Cash on delivery available", or why not (D-70, D-71). */
export function codText(cod: NonNullable<CartView['delivery']>['cod']): string {
  if (cod.allowed) return 'Cash on delivery available';
  const why = cod.reasons.map((r) => COD_REASONS[r]);
  return `No cash on delivery: ${why.join('; ')}`;
}
