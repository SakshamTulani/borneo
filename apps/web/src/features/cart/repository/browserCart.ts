import { cartEntrySchema, couponCodeSchema } from '@borneo/shared';
import { z } from 'zod';
import type { BrowserCart } from '../model';

/** This browser's cart while signed out (D-192). Lines and coupon only; prices come from the API. */
export const CART_STORAGE_KEY = 'borneo.cart';

const storedSchema = z.object({
  lines: z.array(cartEntrySchema).catch([]),
  couponCode: couponCodeSchema.optional().catch(undefined),
});

const empty: BrowserCart = { lines: [] };

export function readBrowserCart(): BrowserCart {
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : empty;
  } catch {
    return empty;
  }
}

export function writeBrowserCart(cart: BrowserCart): void {
  try {
    if (cart.lines.length === 0 && !cart.couponCode)
      window.localStorage.removeItem(CART_STORAGE_KEY);
    else window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage blocked (private mode): the cart lasts for this page only.
  }
}

export const isEmptyCart = (cart: BrowserCart) => cart.lines.length === 0 && !cart.couponCode;
