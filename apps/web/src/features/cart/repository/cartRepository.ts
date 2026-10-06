import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { MAX_LINE_QTY, type CartEntry } from '@borneo/shared';
import {
  deleteCoupon,
  deleteLine,
  getCart,
  patchLine,
  postLine,
  postMerge,
  postQuote,
  putCoupon,
} from '../api/cartApi';
import type { BrowserCart, CartAddResult, CartView } from '../model';
import { isEmptyCart, readBrowserCart, writeBrowserCart } from './browserCart';

/**
 * Signed in, the cart lives in the account (under `['me']`, dropped when the session changes);
 * signed out, in this browser and priced by the API (D-192). Keys include the pincode, since
 * delivery and COD in the answer are for it (D-55).
 */
export const cartKey = (signedIn: boolean, pincode: string | null) =>
  signedIn ? (['me', 'cart', pincode] as const) : (['browser-cart', pincode] as const);
const cartPrefix = (signedIn: boolean) => (signedIn ? ['me', 'cart'] : ['browser-cart']);

let merging: Promise<void> | null = null;

/**
 * The first account read after signing in merges this browser's cart into the account (D-192).
 * The browser copy is cleared before sending so two reads (or tabs) can't add it twice; it is put
 * back if the merge fails.
 */
export function mergeBrowserCartOnce(): Promise<void> {
  merging ??= (async () => {
    const local = readBrowserCart();
    if (isEmptyCart(local)) return;
    writeBrowserCart({ lines: [] });
    try {
      await postMerge(local, null);
    } catch (error) {
      writeBrowserCart(local);
      throw error;
    }
  })().finally(() => {
    merging = null;
  });
  return merging;
}

/** Saves what the API made of the browser cart: clean lines, the coupon as entered. */
function keep(cart: CartView, couponCode: string | undefined) {
  writeBrowserCart({ lines: cart.lines.map(({ key, qty }) => ({ key, qty })), couponCode });
}

async function quoteBrowserCart(next: BrowserCart, pincode: string | null, add?: CartEntry) {
  const result = await postQuote({
    lines: next.lines,
    ...(next.couponCode ? { couponCode: next.couponCode } : {}),
    ...(pincode ? { pincode } : {}),
    ...(add ? { add } : {}),
  });
  keep(result.cart, next.couponCode);
  return result;
}

export const cartQuery = (signedIn: boolean, pincode: string | null) =>
  queryOptions({
    queryKey: cartKey(signedIn, pincode),
    queryFn: async (): Promise<CartView> => {
      if (signedIn) {
        await mergeBrowserCartOnce();
        return getCart(pincode);
      }
      return (await quoteBrowserCart(readBrowserCart(), pincode)).cart;
    },
    // Stock, flash prices and offers move: never trust a cart for long (D-140, D-194).
    staleTime: 15_000,
    // The browser cart lives in localStorage, which the server can't read.
    enabled: signedIn || typeof window !== 'undefined',
  });

/** After a change: this pincode's cart is the answer; other cached carts are stale. */
export function storeCart(
  queryClient: QueryClient,
  signedIn: boolean,
  pincode: string | null,
  cart: CartView,
) {
  const key = cartKey(signedIn, pincode);
  queryClient.setQueryData(key, cart);
  void queryClient.invalidateQueries({
    queryKey: cartPrefix(signedIn),
    predicate: (q) => q.queryKey[q.queryKey.length - 1] !== pincode,
  });
}

export async function addToCart(
  signedIn: boolean,
  entry: CartEntry,
  pincode: string | null,
): Promise<CartAddResult> {
  if (signedIn) return postLine(entry, pincode);
  const result = await quoteBrowserCart(readBrowserCart(), pincode, entry);
  return { cart: result.cart, added: result.added! };
}

export async function setLineQty(
  signedIn: boolean,
  key: string,
  qty: number,
  pincode: string | null,
): Promise<CartView> {
  const next = Math.min(MAX_LINE_QTY, Math.max(1, qty));
  if (signedIn) return patchLine(key, next, pincode);
  const local = readBrowserCart();
  const lines = local.lines.map((l) => (l.key === key ? { ...l, qty: next } : l));
  return (await quoteBrowserCart({ ...local, lines }, pincode)).cart;
}

export async function removeLine(
  signedIn: boolean,
  key: string,
  pincode: string | null,
): Promise<CartView> {
  if (signedIn) return deleteLine(key, pincode);
  const local = readBrowserCart();
  const lines = local.lines.filter((l) => l.key !== key);
  return (await quoteBrowserCart({ ...local, lines }, pincode)).cart;
}

/**
 * A coupon that doesn't qualify is refused with its reason and not kept (D-195). The browser cart
 * asks for a quote with it and keeps it only when it applied.
 */
export async function applyCoupon(
  signedIn: boolean,
  code: string,
  pincode: string | null,
): Promise<CartView> {
  if (signedIn) return putCoupon(code, pincode);
  const local = readBrowserCart();
  const { cart } = await postQuote({
    lines: local.lines,
    couponCode: code,
    ...(pincode ? { pincode } : {}),
  });
  if (cart.coupon?.status !== 'applied') {
    // Shaped like the API's own refusal for account carts (422, COUPON_NOT_APPLICABLE).
    throw Object.assign(
      new Error(
        cart.coupon?.status === 'notApplied' ? cart.coupon.reason : "This coupon doesn't apply.",
      ),
      { status: 422, code: 'COUPON_NOT_APPLICABLE' },
    );
  }
  keep(cart, cart.coupon.code);
  return cart;
}

export async function removeCoupon(signedIn: boolean, pincode: string | null): Promise<CartView> {
  if (signedIn) return deleteCoupon(pincode);
  const local = readBrowserCart();
  return (await quoteBrowserCart({ lines: local.lines }, pincode)).cart;
}
