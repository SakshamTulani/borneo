/** Most products one customer can keep on the wishlist (D-235). */
export const WISHLIST_MAX = 200;

/**
 * Wishlist (owner request, D-235): any product that is sold or will be (live, pre-order or
 * out of stock), at most `WISHLIST_MAX`; adding one already there changes nothing.
 */
export function canAddToWishlist(input: {
  status: 'draft' | 'live' | 'preorder' | 'discontinued';
  count: number;
  alreadySaved: boolean;
}): { ok: true } | { ok: false; reason: 'NOT_SOLD' | 'WISHLIST_FULL' } {
  if (input.alreadySaved) return { ok: true };
  if (input.status !== 'live' && input.status !== 'preorder')
    return { ok: false, reason: 'NOT_SOLD' };
  if (input.count >= WISHLIST_MAX) return { ok: false, reason: 'WISHLIST_FULL' };
  return { ok: true };
}
