/** One tile in the home offer strip (D-191). */
export type OfferTile = {
  id: string;
  kind: 'flash' | 'bank' | 'noCostEmi' | 'coupon';
  /** "Flash sale", "Bank offer", "No-cost EMI", "Coupon". */
  label: string;
  title: string;
  /** Real terms: minimum order, scope, end time. */
  terms: string;
  code?: string;
  /** Flash sales link to the product at the sale variant. */
  product?: { slug: string; sku: string };
  /** When it stops applying (epoch ms); the strip refetches then. */
  endsAt: number;
};
