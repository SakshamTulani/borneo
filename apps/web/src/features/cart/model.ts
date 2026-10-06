import type {
  CartAddResult,
  CartEntry,
  CartLineView,
  CartSuggestion,
  CartView,
  CouponPreview,
  PaymentOfferPreview,
} from '@borneo/shared';

export type {
  CartAddResult,
  CartEntry,
  CartLineView,
  CartSuggestion,
  CartView,
  CouponPreview,
  PaymentOfferPreview,
};

/** The cart kept in this browser while signed out (D-192): lines and coupon only, never prices. */
export type BrowserCart = { lines: CartEntry[]; couponCode?: string | undefined };

/** What a cart change was asked for at; delivery in the answer is for this pincode (D-55). */
export type AtPincode = { pincode: string | null };
