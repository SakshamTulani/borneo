import { describe, expect, it } from 'vitest';
import type { EmiPlan } from '../contracts/catalog';
import type { FlashSale, PaymentOffer } from '../contracts/offers';
import { effectivePrice, priceDisplay, savings } from './pricing';

const now = 1_500;
const window = { validFrom: 0, validTo: 10_000 };
const bank10: PaymentOffer = {
  kind: 'bank',
  id: 'b10',
  name: 'Demo Bank card offer',
  methods: ['card'],
  discount: { kind: 'percent', bps: 1000, maxPaise: 150_000 },
  appliesToAll: true,
  ...window,
};
const bankFlat: PaymentOffer = {
  kind: 'bank',
  id: 'bf',
  name: 'Demo flat ₹500',
  methods: ['card'],
  discount: { kind: 'flat', amountPaise: 50_000 },
  appliesToAll: true,
  ...window,
};
const selective: PaymentOffer = {
  ...bank10,
  id: 'sel',
  name: 'Select cardholders',
  appliesToAll: false,
};
const plans: EmiPlan[] = [
  { id: 'p12', bank: 'DemoBank', tenureMonths: 12, annualRateBps: 1500, minAmountPaise: 1_000_000 },
];
const sale: FlashSale = {
  id: 'f',
  variantId: 'v',
  salePricePaise: 1_999_900,
  startsAt: 1_000,
  endsAt: 2_000,
  cap: 10,
  sold: 0,
  perCustomerLimit: 1,
};

describe('pricing', () => {
  it('D-31: savings only against a higher MRP', () => {
    expect(savings(2_999_900, 2_499_900)).toEqual({ paise: 500_000, percent: 16 });
    expect(savings(2_499_900, 2_499_900)).toBeUndefined();
    expect(savings(undefined, 2_499_900)).toBeUndefined();
  });

  it('D-42: percent is floored and below 1% is not shown', () => {
    expect(savings(100_000, 99_100)).toBeUndefined(); // 0.9%
    expect(savings(100_000, 98_900)).toEqual({ paise: 1_100, percent: 1 });
  });

  it('D-32: effective price only from offers that apply to everyone paying that way', () => {
    expect(effectivePrice(2_499_900, 'smartphones', [selective], now)).toBeUndefined();
    expect(effectivePrice(2_499_900, 'smartphones', [bank10, bankFlat], now)).toEqual({
      paise: 2_349_900,
      offerName: 'Demo Bank card offer',
    });
  });

  it('D-32: effective price respects window, scope and minimum', () => {
    expect(
      effectivePrice(2_499_900, 'audio', [{ ...bank10, categoryIds: ['smartphones'] }], now),
    ).toBeUndefined();
    expect(
      effectivePrice(2_499_900, 'smartphones', [{ ...bank10, validTo: now }], now),
    ).toBeUndefined();
    expect(
      effectivePrice(2_499_900, 'smartphones', [{ ...bank10, minOrderPaise: 3_000_000 }], now),
    ).toBeUndefined();
  });

  it('D-30: the headline is the selling price, never the effective price', () => {
    const d = priceDisplay({
      regularPaise: 2_499_900,
      mrpPaise: 2_999_900,
      categoryId: 'smartphones',
      paymentOffers: [bank10],
      emiPlans: plans,
      now,
    });
    expect(d.sellingPaise).toBe(2_499_900);
    expect(d.effective?.paise).toBe(2_349_900);
    expect(d.savings).toEqual({ paise: 500_000, percent: 16 });
  });

  it('D-33: EMI "from" shows where a plan is available', () => {
    expect(
      priceDisplay({
        regularPaise: 2_499_900,
        categoryId: 'smartphones',
        paymentOffers: [],
        emiPlans: plans,
        now,
      }).emiFromPaise,
    ).toBe(225_637);
    expect(
      priceDisplay({
        regularPaise: 99_900,
        categoryId: 'accessories',
        paymentOffers: [],
        emiPlans: plans,
        now,
      }).emiFromPaise,
    ).toBeUndefined();
  });

  it('D-33: a live no-cost EMI offer lowers "from" to an interest-free instalment', () => {
    const noCost: PaymentOffer = {
      kind: 'noCostEmi',
      id: 'nc',
      name: 'No-cost EMI',
      tenureMonths: 12,
      annualRateBps: 1500,
      appliesToAll: false,
      ...window,
    };
    expect(
      priceDisplay({
        regularPaise: 2_499_900,
        categoryId: 'smartphones',
        paymentOffers: [noCost],
        emiPlans: plans,
        now,
      }).emiFromPaise,
    ).toBe(208_325);
  });

  it('D-45: no-cost EMI is never shown as an effective price', () => {
    const noCost: PaymentOffer = {
      kind: 'noCostEmi',
      id: 'nc',
      name: 'No-cost EMI',
      tenureMonths: 12,
      annualRateBps: 1500,
      appliesToAll: true,
      ...window,
    };
    expect(effectivePrice(2_499_900, 'smartphones', [noCost], now)).toBeUndefined();
  });

  it('D-47: a no-cost offer out of scope or below its minimum does not lower "from"', () => {
    const noCost: PaymentOffer = {
      kind: 'noCostEmi',
      id: 'nc',
      name: 'No-cost EMI',
      tenureMonths: 12,
      annualRateBps: 1500,
      appliesToAll: false,
      ...window,
    };
    const base = { regularPaise: 2_499_900, categoryId: 'audio', emiPlans: plans, now };
    expect(
      priceDisplay({ ...base, paymentOffers: [{ ...noCost, categoryIds: ['smartphones'] }] })
        .emiFromPaise,
    ).toBe(225_637);
    expect(
      priceDisplay({ ...base, paymentOffers: [{ ...noCost, minOrderPaise: 3_000_000 }] })
        .emiFromPaise,
    ).toBe(225_637);
  });

  it('D-42: below 1% savings the MRP is not shown either', () => {
    const d = priceDisplay({
      regularPaise: 99_100,
      mrpPaise: 100_000,
      categoryId: 'audio',
      paymentOffers: [],
      emiPlans: [],
      now,
    });
    expect(d).toEqual({ sellingPaise: 99_100, priceSource: 'regular' });
  });

  it('D-140: a live flash price becomes the selling price; MRP savings follow it', () => {
    const d = priceDisplay({
      regularPaise: 2_499_900,
      mrpPaise: 2_999_900,
      categoryId: 'smartphones',
      flashSale: sale,
      paymentOffers: [],
      emiPlans: [],
      now,
    });
    expect(d).toEqual({
      sellingPaise: 1_999_900,
      priceSource: 'flash',
      mrpPaise: 2_999_900,
      savings: { paise: 1_000_000, percent: 33 },
    });
  });

  it('D-36: payment offers still show an effective price on flash prices', () => {
    const d = priceDisplay({
      regularPaise: 2_499_900,
      categoryId: 'smartphones',
      flashSale: sale,
      paymentOffers: [bank10],
      emiPlans: [],
      now,
    });
    expect(d.effective).toEqual({ paise: 1_849_900, offerName: 'Demo Bank card offer' }); // 10% capped at ₹1,500
  });
});
