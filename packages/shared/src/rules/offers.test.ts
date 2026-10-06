import { describe, expect, it } from 'vitest';
import type { CartLine } from '../contracts/cart';
import type { Coupon, Coupon as StripCoupon, FlashSale, PaymentOffer } from '../contracts/offers';
import { emiInterest } from './emi';
import { discountAmount, offerStrip, priceOrder, productOffers, type FlashListing } from './offers';

const now = 1_500;
const window = { validFrom: 0, validTo: 10_000 };
const phone: CartLine = {
  lineId: 'phone',
  kind: 'item',
  categoryIds: ['smartphones'],
  qty: 1,
  unitPricePaise: 2_000_000,
  priceSource: 'regular',
  isPreorder: false,
};
const case_: CartLine = {
  lineId: 'case',
  kind: 'item',
  categoryIds: ['accessories'],
  qty: 2,
  unitPricePaise: 100_000,
  priceSource: 'regular',
  isPreorder: false,
};
const flashPods: CartLine = {
  lineId: 'pods',
  kind: 'item',
  categoryIds: ['audio'],
  qty: 1,
  unitPricePaise: 500_000,
  priceSource: 'flash',
  isPreorder: false,
};
const bundle: CartLine = {
  lineId: 'bundle',
  kind: 'bundle',
  categoryIds: ['smartphones', 'audio'],
  qty: 1,
  unitPricePaise: 2_400_000,
  priceSource: 'bundle',
  isPreorder: false,
};

const flat500: Coupon = {
  id: 'c500',
  code: 'DEMO500',
  name: '₹500 off',
  discount: { kind: 'flat', amountPaise: 50_000 },
  ...window,
};
const tenPct: Coupon = {
  id: 'c10',
  code: 'TEN',
  name: '10% off',
  discount: { kind: 'percent', bps: 1000, maxPaise: 100_000 },
  ...window,
};
const bank: PaymentOffer = {
  kind: 'bank',
  id: 'bank',
  name: 'Demo Bank',
  methods: ['card'],
  banks: ['DemoBank'],
  discount: { kind: 'percent', bps: 1000, maxPaise: 150_000 },
  appliesToAll: true,
  ...window,
};
const noCost: PaymentOffer = {
  kind: 'noCostEmi',
  id: 'nc',
  name: 'No-cost EMI',
  tenureMonths: 6,
  annualRateBps: 1500,
  appliesToAll: false,
  ...window,
};
const card = { method: 'card' as const, bank: 'DemoBank' };

const run = (over: Partial<Parameters<typeof priceOrder>[0]>) =>
  priceOrder({
    lines: [phone, case_],
    coupons: [flat500, tenPct],
    paymentOffers: [bank, noCost],
    now,
    ...over,
  });

describe('offers', () => {
  it('D-40: flat and percent coupons, percent capped and never above the base', () => {
    expect(discountAmount({ kind: 'flat', amountPaise: 50_000 }, 10_000)).toBe(10_000);
    expect(discountAmount({ kind: 'percent', bps: 1000, maxPaise: 100_000 }, 2_200_000)).toBe(
      100_000,
    );
    expect(discountAmount({ kind: 'percent', bps: 1000 }, 2_200_000)).toBe(220_000);
  });

  it('D-35: one coupon and one payment offer apply together; shares sum to each discount', () => {
    const r = run({ couponCode: 'demo500', paymentOfferId: 'bank', payment: card });
    expect(r.coupon).toEqual({ id: 'c500', discountPaise: 50_000 });
    expect(r.paymentOffer).toEqual({ id: 'bank', discountPaise: 150_000 }); // 10% of 21,50,000 capped at 1,50,000
    expect(r.totalPaise).toBe(2_200_000 - 50_000 - 150_000);
    expect(r.lines.reduce((a, l) => a + l.couponDiscountPaise, 0)).toBe(50_000);
    expect(r.lines.reduce((a, l) => a + l.paymentDiscountPaise, 0)).toBe(150_000);
    expect(r.rejections).toEqual([]);
  });

  it('D-35: no-cost EMI uses the payment-offer slot and discounts the interest', () => {
    const r = run({ paymentOfferId: 'nc', payment: { method: 'emi', tenureMonths: 6 } });
    expect(r.paymentOffer?.id).toBe('nc');
    expect(r.paymentOffer!.discountPaise).toBeGreaterThan(0);
    expect(
      run({ paymentOfferId: 'nc', payment: { method: 'emi', tenureMonths: 12 } }).rejections,
    ).toEqual(['PAYMENT_OFFER_METHOD_MISMATCH']);
  });

  it('D-35: COD and mismatched methods or banks get no payment offer', () => {
    expect(run({ paymentOfferId: 'bank', payment: { method: 'cod' } }).rejections).toEqual([
      'PAYMENT_OFFER_METHOD_MISMATCH',
    ]);
    expect(run({ paymentOfferId: 'bank', payment: { method: 'upi' } }).rejections).toEqual([
      'PAYMENT_OFFER_METHOD_MISMATCH',
    ]);
    expect(
      run({ paymentOfferId: 'bank', payment: { method: 'card', bank: 'Other' } }).rejections,
    ).toEqual(['PAYMENT_OFFER_METHOD_MISMATCH']);
    expect(run({ paymentOfferId: 'bank' }).rejections).toEqual(['PAYMENT_OFFER_METHOD_MISMATCH']);
  });

  it('D-36: coupons skip flash-priced lines; payment offers still apply to them', () => {
    const r = run({
      lines: [flashPods, case_],
      couponCode: 'TEN',
      paymentOfferId: 'bank',
      payment: card,
    });
    const pods = r.lines.find((l) => l.lineId === 'pods')!;
    expect(pods.couponDiscountPaise).toBe(0);
    expect(pods.paymentDiscountPaise).toBeGreaterThan(0);
    expect(r.coupon?.discountPaise).toBe(20_000); // 10% of the case lines only
  });

  it('D-37: coupons skip bundle prices; a bundle-only cart rejects the coupon', () => {
    const r = run({
      lines: [bundle],
      couponCode: 'DEMO500',
      paymentOfferId: 'bank',
      payment: card,
    });
    expect(r.rejections).toEqual(['COUPON_NO_ELIGIBLE_ITEMS']);
    expect(r.paymentOffer?.discountPaise).toBe(150_000);
  });

  it('D-40: category-scoped coupons only discount lines in scope', () => {
    const scoped = { ...tenPct, categoryIds: ['accessories'] };
    const r = run({ coupons: [scoped], couponCode: 'TEN' });
    expect(r.lines.find((l) => l.lineId === 'phone')!.couponDiscountPaise).toBe(0);
    expect(r.coupon?.discountPaise).toBe(20_000);
  });

  it('D-43: coupon minimum is measured on the coupon-eligible subtotal', () => {
    const min = { ...flat500, minOrderPaise: 600_000 };
    expect(
      run({ lines: [flashPods, case_], coupons: [min], couponCode: 'DEMO500' }).rejections,
    ).toEqual(['COUPON_MIN_ORDER']);
    expect(run({ coupons: [min], couponCode: 'DEMO500' }).coupon?.discountPaise).toBe(50_000);
  });

  it('D-44: payment offer is computed after the coupon and checks its minimum there', () => {
    const minBank = {
      ...bank,
      minOrderPaise: 2_160_000,
      discount: { kind: 'flat' as const, amountPaise: 10_000 },
    };
    expect(
      run({
        paymentOffers: [minBank],
        couponCode: 'DEMO500',
        paymentOfferId: 'bank',
        payment: card,
      }).rejections,
    ).toEqual(['PAYMENT_OFFER_MIN_ORDER']);
  });

  it('D-34: unknown or inactive offers are rejected with a reason', () => {
    expect(run({ couponCode: 'NOPE' }).rejections).toEqual(['COUPON_NOT_FOUND']);
    expect(
      run({ coupons: [{ ...flat500, validTo: now }], couponCode: 'DEMO500' }).rejections,
    ).toEqual(['COUPON_NOT_ACTIVE']);
    expect(run({ paymentOfferId: 'nope', payment: card }).rejections).toEqual([
      'PAYMENT_OFFER_NOT_FOUND',
    ]);
    expect(
      run({
        paymentOffers: [{ ...bank, validFrom: now + 1 }],
        paymentOfferId: 'bank',
        payment: card,
      }).rejections,
    ).toEqual(['PAYMENT_OFFER_NOT_ACTIVE']);
    expect(
      run({
        paymentOffers: [{ ...bank, categoryIds: ['tvs'] }],
        paymentOfferId: 'bank',
        payment: card,
      }).rejections,
    ).toEqual(['PAYMENT_OFFER_NO_ELIGIBLE_ITEMS']);
  });

  it('D-45: no-cost EMI discount equals the interest the plan would charge', () => {
    const r = run({ paymentOfferId: 'nc', payment: { method: 'emi', tenureMonths: 6 } });
    expect(r.paymentOffer?.discountPaise).toBe(emiInterest(2_200_000, 6, 1500));
  });

  it('D-46: discount shares are floored with the remainder on the last line', () => {
    const lines = ['a', 'b', 'c'].map((id) => ({
      ...case_,
      lineId: id,
      qty: 1,
      unitPricePaise: 1_000,
    }));
    const odd = { ...flat500, discount: { kind: 'flat' as const, amountPaise: 100 } };
    const r = run({ lines, coupons: [odd], couponCode: 'DEMO500' });
    expect(r.lines.map((l) => l.couponDiscountPaise)).toEqual([33, 33, 34]);
  });

  it('D-44: no-cost EMI interest is computed on the post-coupon amount', () => {
    const r = run({
      couponCode: 'DEMO500',
      paymentOfferId: 'nc',
      payment: { method: 'emi', tenureMonths: 6 },
    });
    expect(r.paymentOffer?.discountPaise).toBe(emiInterest(2_200_000 - 50_000, 6, 1500));
  });

  it('D-37: in a mixed cart the coupon applies to regular lines only, not the bundle', () => {
    const r = run({ lines: [bundle, case_], couponCode: 'TEN' });
    expect(r.lines.find((l) => l.lineId === 'bundle')!.couponDiscountPaise).toBe(0);
    expect(r.coupon?.discountPaise).toBe(20_000);
  });

  it('D-41: no offers means total equals subtotal', () => {
    const r = run({});
    expect(r.subtotalPaise).toBe(2_200_000);
    expect(r.totalPaise).toBe(2_200_000);
  });

  describe('productOffers', () => {
    const scoped: Coupon = { ...tenPct, id: 'audio', categoryIds: ['audio'] };
    const expired: PaymentOffer = { ...bank, id: 'old', validFrom: 0, validTo: 1_000 };
    const offers = (priceSource: 'regular' | 'flash') =>
      productOffers({
        categoryId: 'smartphones',
        priceSource,
        coupons: [{ ...flat500, minOrderPaise: 499_900 }, scoped],
        paymentOffers: [bank, noCost, expired],
        now,
      });

    it('D-34: lists live, in-scope offers, payment offers first, with their terms', () => {
      expect(offers('regular')).toEqual([
        { id: 'bank', kind: 'bank', name: 'Demo Bank', validTo: 10_000, status: 'available' },
        { id: 'nc', kind: 'noCostEmi', name: 'No-cost EMI', validTo: 10_000, status: 'available' },
        {
          id: 'c500',
          kind: 'coupon',
          name: '₹500 off',
          code: 'DEMO500',
          minOrderPaise: 499_900,
          validTo: 10_000,
          status: 'available',
        },
      ]);
    });

    it('D-36: coupons show as not applicable on a live flash price; payment offers still apply', () => {
      const list = offers('flash');
      expect(list.find((o) => o.kind === 'coupon')).toMatchObject({
        status: 'notApplicable',
        reason: "Coupons don't apply to flash sale prices",
      });
      expect(list.filter((o) => o.kind !== 'coupon').every((o) => o.status === 'available')).toBe(
        true,
      );
    });
  });
});

const stripNow = Date.UTC(2026, 9, 6, 6, 30);
const stripHour = 3_600_000;

const stripSale = (id: string, over: Partial<FlashSale> = {}): FlashListing => ({
  sale: {
    id,
    variantId: 'v',
    salePricePaise: 199_900,
    startsAt: stripNow - stripHour,
    endsAt: stripNow + 2 * stripHour,
    cap: 50,
    sold: 10,
    perCustomerLimit: 1,
    ...over,
  },
  productName: `Product ${id}`,
  productSlug: `product-${id}`,
  sku: `SKU-${id}`,
  regularPricePaise: 299_900,
});

const stripCoupon = (id: string, over: Partial<StripCoupon> = {}): StripCoupon => ({
  id,
  code: id.toUpperCase(),
  name: `Coupon ${id}`,
  discount: { kind: 'flat', amountPaise: 50_000 },
  validFrom: stripNow - stripHour,
  validTo: stripNow + 24 * stripHour,
  ...over,
});

const stripBank: PaymentOffer = {
  kind: 'bank',
  id: 'hdfc',
  name: '10% off with HDFC cards',
  methods: ['card'],
  discount: { kind: 'percent', bps: 1000, maxPaise: 150_000 },
  appliesToAll: false,
  minOrderPaise: 1_000_000,
  validFrom: stripNow - stripHour,
  validTo: stripNow + 48 * stripHour,
};

describe('offer strip', () => {
  it('D-191: live flash sales first, ending soonest, then payment offers, then coupons', () => {
    const items = offerStrip({
      flash: [
        stripSale('late', { endsAt: stripNow + 5 * stripHour }),
        stripSale('soon', { endsAt: stripNow + stripHour }),
      ],
      paymentOffers: [stripBank],
      coupons: [stripCoupon('audio', { categoryIds: ['audio'] })],
      now: stripNow,
    });
    expect(items.map((i) => i.id)).toEqual(['soon', 'late', 'hdfc', 'audio']);
    expect(items[2]).toEqual({
      kind: 'bank',
      id: 'hdfc',
      name: '10% off with HDFC cards',
      minOrderPaise: 1_000_000,
      scoped: false,
      validTo: stripNow + 48 * stripHour,
    });
    expect(items[3]).toMatchObject({ kind: 'coupon', code: 'AUDIO', scoped: true });
    expect(items[0]).toMatchObject({
      kind: 'flash',
      salePricePaise: 199_900,
      regularPricePaise: 299_900,
    });
  });

  it('D-191: never shows upcoming, ended or sold-out offers', () => {
    expect(
      offerStrip({
        flash: [
          stripSale('upcoming', {
            startsAt: stripNow + stripHour,
            endsAt: stripNow + 2 * stripHour,
          }),
          stripSale('ended', { startsAt: stripNow - 2 * stripHour, endsAt: stripNow }),
          stripSale('soldOut', { sold: 50 }),
        ],
        paymentOffers: [{ ...stripBank, validFrom: stripNow + stripHour }],
        coupons: [stripCoupon('old', { validTo: stripNow - 1 })],
        now: stripNow,
      }),
    ).toEqual([]);
  });
});
