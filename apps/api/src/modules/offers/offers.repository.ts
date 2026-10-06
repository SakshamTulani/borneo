import { gt } from 'drizzle-orm';
import {
  couponSchema,
  emiPlanSchema,
  paymentOfferSchema,
  type Coupon,
  type EmiPlan,
  type PaymentOffer,
} from '@borneo/shared';
import type { Db } from '../../db/client';
import { emiPlan, offer } from '../../db/schema/index';

/** Every price-relevant offer and EMI plan. Rules decide which are live and in scope (D-32–35). */
export type OfferBook = { coupons: Coupon[]; paymentOffers: PaymentOffer[]; emiPlans: EmiPlan[] };

/** Offers that have not ended yet, parsed with the shared contracts (jsonb is never trusted). */
export async function loadOfferBook(db: Db, now: Date): Promise<OfferBook> {
  const [offers, plans] = await Promise.all([
    db.select().from(offer).where(gt(offer.activeTo, now)),
    db.select().from(emiPlan),
  ]);
  const window = (o: (typeof offers)[number]) => ({
    validFrom: o.activeFrom.getTime(),
    validTo: o.activeTo.getTime(),
  });
  return {
    coupons: offers
      .filter((o) => o.kind === 'coupon')
      .map((o) =>
        couponSchema.parse({ ...o.rules, id: o.id, code: o.code, name: o.name, ...window(o) }),
      ),
    paymentOffers: offers
      .filter((o) => o.kind !== 'coupon')
      .map((o) =>
        paymentOfferSchema.parse({
          ...o.rules,
          id: o.id,
          name: o.name,
          appliesToAll: o.appliesToAll,
          ...window(o),
        }),
      ),
    emiPlans: plans.map((p) => emiPlanSchema.parse(p)),
  };
}
