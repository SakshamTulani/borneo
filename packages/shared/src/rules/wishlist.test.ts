import { describe, expect, it } from 'vitest';
import { canAddToWishlist, WISHLIST_MAX } from './wishlist';

describe('wishlist', () => {
  it('D-235: any product that is sold or on pre-order, up to the limit; re-adding is a no-op', () => {
    expect(canAddToWishlist({ status: 'live', count: 0, alreadySaved: false })).toEqual({
      ok: true,
    });
    expect(canAddToWishlist({ status: 'preorder', count: 0, alreadySaved: false }).ok).toBe(true);
    expect(canAddToWishlist({ status: 'discontinued', count: 0, alreadySaved: false })).toEqual({
      ok: false,
      reason: 'NOT_SOLD',
    });
    expect(canAddToWishlist({ status: 'live', count: WISHLIST_MAX, alreadySaved: false })).toEqual({
      ok: false,
      reason: 'WISHLIST_FULL',
    });
    expect(canAddToWishlist({ status: 'live', count: WISHLIST_MAX, alreadySaved: true }).ok).toBe(
      true,
    );
  });
});
