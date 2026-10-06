import { describe, expect, it } from 'vitest';
import type { EmiPlan } from '../contracts/catalog';
import type { Coupon, FlashSale, PaymentOffer } from '../contracts/offers';
import { sumPaise } from '../money';
import { priceCart, type BundleFacts, type ItemFacts } from './cart';
import {
  cartAfterOrder,
  checkout,
  financialYear,
  gstRateLabel,
  gstSplit,
  invoiceNumber,
  isIntraState,
  orderLines,
  orderNoticeText,
  orderNumber,
  paymentSelection,
} from './checkout';
import { codEligibility } from './cod';
import { emiMonthly } from './emi';
import { warehousesBySpeed } from './serviceability';

const now = 5_000;
const window = { validFrom: 0, validTo: 10_000 };

const phone: ItemFacts = {
  kind: 'item',
  productId: 'p-phone',
  categoryId: 'smartphones',
  status: 'live',
  regularPaise: 2_000_000,
  unitsAvailable: 10,
  preorderCap: null,
  preorderSold: 0,
  flashSales: [],
};
const sale: FlashSale = {
  id: 'fs',
  variantId: 'v-buds',
  salePricePaise: 280_000,
  startsAt: 0,
  endsAt: 8_000,
  cap: 40,
  sold: 3,
  perCustomerLimit: 1,
};
const buds: ItemFacts = {
  ...phone,
  productId: 'p-buds',
  categoryId: 'audio',
  regularPaise: 350_000,
  flashSales: [sale],
};
const bundle: BundleFacts = {
  kind: 'bundle',
  pricePaise: 2_100_000,
  activeFrom: 0,
  activeTo: null,
  members: [
    { ...memberOf(phone), unitsAvailable: 9, qty: 1 },
    { ...memberOf(buds), unitsAvailable: 4, qty: 2 },
  ],
};
function memberOf(f: ItemFacts) {
  return {
    productId: f.productId,
    categoryId: f.categoryId,
    status: f.status,
    regularPaise: f.regularPaise,
  };
}

const welcome: Coupon = {
  id: 'c1',
  code: 'WELCOME500',
  name: '₹500 off',
  discount: { kind: 'flat', amountPaise: 50_000 },
  ...window,
};
const hdfc: PaymentOffer = {
  id: 'po-hdfc',
  kind: 'bank',
  name: '10% off with HDFC cards',
  methods: ['card'],
  banks: ['HDFC'],
  discount: { kind: 'percent', bps: 1_000, maxPaise: 150_000 },
  appliesToAll: false,
  ...window,
};
const noCost: PaymentOffer = {
  id: 'po-nocost',
  kind: 'noCostEmi',
  name: 'No-cost EMI, 6 months',
  tenureMonths: 6,
  annualRateBps: 1_500,
  appliesToAll: true,
  ...window,
};
const plans: EmiPlan[] = [
  { id: 'e1', bank: 'HDFC', tenureMonths: 6, annualRateBps: 1_500, minAmountPaise: 300_000 },
  { id: 'e2', bank: 'ICICI', tenureMonths: 12, annualRateBps: 1_600, minAmountPaise: 5_000_000 },
];

const entries = [
  { key: 'item:PHONE-1', qty: 1, facts: phone },
  { key: 'item:BUDS-1', qty: 2, facts: buds },
];
const priced = (es: Parameters<typeof priceCart>[0]['entries'] = entries, couponCode?: string) =>
  priceCart({
    entries: es,
    ...(couponCode ? { couponCode } : {}),
    coupons: [welcome],
    paymentOffers: [hdfc, noCost],
    emiPlans: plans,
    now,
  });
const ok = { status: 'deliverable' as const, from: '2026-10-08', to: '2026-10-09' };
const codOk = codEligibility({
  lines: [{ codAllowedAtPincode: true, isPreorder: false, isFlash: false }],
  orderTotalPaise: 0,
});
const run = (over: Partial<Parameters<typeof checkout>[0]> = {}) =>
  checkout({
    pricing: priced(),
    deliveries: [ok, ok],
    cod: codOk,
    choice: {},
    coupons: [welcome],
    paymentOffers: [hdfc, noCost],
    emiPlans: plans,
    now,
    ...over,
  });

describe('checkout', () => {
  it('D-201: nothing is chosen for the customer: no method, no offer, total without offers', () => {
    const c = run();
    expect(c.blocks).toEqual(['NO_PAYMENT_METHOD']);
    expect(c.canPlace).toBe(false);
    expect(c.totals.paymentDiscountPaise).toBe(0);
    expect(c.totals.totalPaise).toBe(2_000_000 + 280_000 + 350_000);
  });

  it('D-198: lines that need attention block placing', () => {
    const c = run({
      pricing: priced([{ key: 'item:PHONE-1', qty: 5, facts: { ...phone, unitsAvailable: 2 } }]),
    });
    expect(c.blocks).toContain('LINES_NEED_ATTENTION');
    expect(run({ pricing: priced([]) }).blocks).toContain('CART_EMPTY');
  });

  it('D-55: placing needs an address every line can be delivered to', () => {
    expect(run({ deliveries: null, cod: null }).blocks).toContain('NO_ADDRESS');
    expect(
      run({ deliveries: [ok, { status: 'notDeliverable' }], choice: { method: 'upi' } }).blocks,
    ).toEqual(['NOT_DELIVERABLE']);
  });

  it('D-70: UPI, cards, EMI and COD where COD is allowed', () => {
    expect(run({ choice: { method: 'upi' } }).canPlace).toBe(true);
    expect(run().methods.every((m) => m.allowed)).toBe(true);
  });

  it('D-71: COD is offered only when every line allows it, with the reasons', () => {
    const cod = codEligibility({
      lines: [{ codAllowedAtPincode: true, isPreorder: false, isFlash: true }],
      orderTotalPaise: 0,
    });
    const c = run({ cod, choice: { method: 'cod' } });
    expect(c.methods.find((m) => m.method === 'cod')).toEqual({
      method: 'cod',
      allowed: false,
      reasons: ['FLASH_SALE'],
    });
    expect(c.blocks).toEqual(['PAYMENT_NOT_ALLOWED']);
  });

  it('D-202: EMI needs one of the plans available at this total', () => {
    const c = run({ choice: { method: 'emi' } });
    expect(c.blocks).toEqual(['EMI_PLAN_NEEDED']);
    // ICICI needs ₹50,000; the cart is ₹26,300.
    expect(c.emiPlans.map((p) => p.bank)).toEqual(['HDFC']);
    expect(run({ choice: { method: 'emi', bank: 'ICICI', tenureMonths: 12 } }).blocks).toEqual([
      'EMI_PLAN_NEEDED',
    ]);
    const chosen = run({ choice: { method: 'emi', bank: 'HDFC', tenureMonths: 6 } });
    expect(chosen.canPlace).toBe(true);
    expect(chosen.totals.emiMonthlyPaise).toBe(emiMonthly(2_630_000, 6, 1_500));
  });

  it('D-35: one payment offer, chosen by the customer; COD takes none', () => {
    const c = run({ choice: { method: 'card', bank: 'HDFC', paymentOfferId: hdfc.id } });
    expect(c.canPlace).toBe(true);
    expect(c.totals.paymentDiscountPaise).toBe(150_000);
    expect(c.totals.totalPaise).toBe(2_630_000 - 150_000);
    const cod = run({ choice: { method: 'cod', paymentOfferId: hdfc.id } });
    expect(cod.blocks).toEqual(['PAYMENT_OFFER_NOT_APPLICABLE']);
  });

  it("D-202: a chosen offer that doesn't fit the payment blocks placing and says how to pay", () => {
    const c = run({ choice: { method: 'upi', paymentOfferId: hdfc.id } });
    expect(c.blocks).toEqual(['PAYMENT_OFFER_NOT_APPLICABLE']);
    expect(c.paymentOfferReason).toBe('Pay by card with HDFC to use this offer.');
    expect(c.totals.paymentDiscountPaise).toBe(0);
    expect(run({ choice: { method: 'upi', paymentOfferId: 'gone' } }).paymentOfferReason).toBe(
      'This offer has ended.',
    );
    const emi = run({
      choice: { method: 'emi', bank: 'HDFC', tenureMonths: 3, paymentOfferId: noCost.id },
    });
    expect(emi.paymentOfferReason).toBe('Pay by EMI over 6 months.');
  });

  it('D-196: every live payment offer shows what it saves on this order', () => {
    const c = run();
    expect(c.paymentOffers[0]!.savingPaise).toBe(150_000);
    expect(c.paymentOffers[1]!.savingPaise).toBe(emiMonthly(2_630_000, 6, 1_500) * 6 - 2_630_000);
    expect(c.paymentOffers[0]).toMatchObject({
      methods: ['card'],
      banks: ['HDFC'],
      tenureMonths: null,
    });
    expect(c.paymentOffers[1]).toMatchObject({ methods: ['emi'], tenureMonths: 6 });
    expect(c.emiPlans[0]!.noCostOfferId).toBe('po-nocost');
    expect(c.banks).toEqual(['HDFC']);
  });

  it('D-45: no-cost EMI takes the interest off upfront, so the months repay about the price', () => {
    const c = run({
      choice: { method: 'emi', bank: 'HDFC', tenureMonths: 6, paymentOfferId: noCost.id },
    });
    expect(c.canPlace).toBe(true);
    expect(c.totals.paymentDiscountPaise).toBeGreaterThan(0);
    expect(c.totals.emiMonthlyPaise).toBe(Math.round(2_630_000 / 6));
  });

  it('D-195: the coupon is the one applied on the cart', () => {
    const c = run({ pricing: priced(entries, 'WELCOME500'), choice: { method: 'upi' } });
    expect(c.totals.couponDiscountPaise).toBe(50_000);
    expect(c.totals.totalPaise).toBe(2_630_000 - 50_000);
  });

  it('builds the payment for priceOrder only from what was chosen', () => {
    expect(paymentSelection({})).toBeUndefined();
    expect(paymentSelection({ method: 'upi', tenureMonths: 6 })).toEqual({ method: 'upi' });
    expect(paymentSelection({ method: 'emi', bank: 'HDFC', tenureMonths: 6 })).toEqual({
      method: 'emi',
      bank: 'HDFC',
      tenureMonths: 6,
    });
  });
});

describe('order lines', () => {
  it('D-194: items keep their selling price; one flash unit, the rest regular', () => {
    const c = run({
      pricing: priced(entries, 'WELCOME500'),
      choice: { method: 'card', bank: 'HDFC', paymentOfferId: hdfc.id },
    });
    const lines = orderLines({ entries, order: c.order, now });
    expect(lines.map((l) => [l.sku, l.qty, l.unitPricePaise, l.flashSaleId])).toEqual([
      ['PHONE-1', 1, 2_000_000, null],
      ['BUDS-1', 1, 280_000, 'fs'],
      ['BUDS-1', 1, 350_000, null],
    ]);
  });

  it('D-46: item discounts add up exactly to the order total', () => {
    const c = run({
      pricing: priced(entries, 'WELCOME500'),
      choice: { method: 'card', bank: 'HDFC', paymentOfferId: hdfc.id },
    });
    const lines = orderLines({ entries, order: c.order, now });
    const net = sumPaise(lines.map((l) => l.unitPricePaise * l.qty - l.discountPaise));
    expect(net).toBe(c.totals.totalPaise);
  });

  it('D-36: the flash unit takes no coupon share, only the payment offer', () => {
    const coupon = run({ pricing: priced(entries, 'WELCOME500'), choice: { method: 'upi' } });
    const flash = orderLines({ entries, order: coupon.order, now }).find((l) => l.flashSaleId);
    expect(flash!.discountPaise).toBe(0);
  });

  it('D-37: a bundle becomes its members at regular prices, the saving spread by value', () => {
    const es = [{ key: 'bundle:kit', qty: 1, facts: bundle, memberSkus: ['PHONE-1', 'BUDS-1'] }];
    const c = run({ pricing: priced(es), deliveries: [ok] });
    const lines = orderLines({ entries: es, order: c.order, now });
    expect(lines.map((l) => [l.sku, l.qty, l.unitPricePaise, l.bundleKey])).toEqual([
      ['PHONE-1', 1, 2_000_000, 'bundle:kit'],
      ['BUDS-1', 2, 350_000, 'bundle:kit'],
    ]);
    expect(sumPaise(lines.map((l) => l.discountPaise))).toBe(2_700_000 - 2_100_000);
    for (const l of lines) expect(l.discountPaise).toBeLessThanOrEqual(l.unitPricePaise * l.qty);
    expect(() =>
      orderLines({ entries: [{ ...es[0]!, memberSkus: ['PHONE-1'] }], order: c.order, now }),
    ).toThrow('one SKU per bundle member');
  });
});

describe('after the order', () => {
  it('D-207: what was ordered and the coupon used leave the cart; units added since stay', () => {
    const cart = {
      entries: [
        { key: 'item:A', qty: 3 },
        { key: 'item:B', qty: 2 },
        { key: 'bundle:kit', qty: 1 },
      ],
      couponCode: 'welcome500',
    };
    expect(
      cartAfterOrder(cart, {
        lines: [
          { key: 'item:A', qty: 1 },
          { key: 'item:A', qty: 1 },
          { key: 'item:B', qty: 2 },
          { key: 'bundle:kit', qty: 1 },
        ],
        couponCode: 'WELCOME500',
      }),
    ).toEqual({ entries: [{ key: 'item:A', qty: 1 }], couponCode: undefined });
    expect(cartAfterOrder(cart, { lines: [], couponCode: null }).couponCode).toBe('welcome500');
  });

  it('D-57: the customer is told what happened, in plain words', () => {
    expect(orderNoticeText('HOLD_EXPIRED', 100)).toContain('went back to stock');
    expect(orderNoticeText('PAYMENT_FAILED', 100)).toContain('Nothing was charged');
    expect(orderNoticeText('CONFIRMED_AFTER_EXPIRY', 100)).toContain('confirmed');
  });

  it('D-59: a late payment with nothing left is refunded in full, and we say so', () => {
    expect(orderNoticeText('REFUNDED_AFTER_EXPIRY', 123_400)).toContain('₹1,234');
  });
});

describe('numbers', () => {
  it('D-208: order numbers come from a sequence', () => {
    expect(orderNumber(42)).toBe('BN-000042');
    expect(orderNumber(1_234_567)).toBe('BN-1234567');
  });

  it('D-208: invoice numbers carry the April–March financial year in IST', () => {
    // 31 March 2027 23:00 IST is still 2026–27; 1 April 00:30 IST is 2027–28.
    expect(financialYear(Date.parse('2027-03-31T17:30:00Z'))).toBe('2627');
    expect(financialYear(Date.parse('2027-03-31T19:00:00Z'))).toBe('2728');
    expect(invoiceNumber(7, Date.parse('2026-10-06T06:30:00Z'))).toBe('INV2627-000007');
    expect(() => invoiceNumber(10 ** 10, 0)).toThrow('too long');
  });
});

describe('GST', () => {
  it('D-209: tax is taken out of the inclusive price and the parts add back up', () => {
    const intra = gstSplit({ valuePaise: 118_001, rateBps: 1_800 }, true);
    expect(intra.taxablePaise).toBe(100_001);
    expect(intra.cgstPaise + intra.sgstPaise).toBe(18_000);
    expect(intra.sgstPaise - intra.cgstPaise).toBeLessThanOrEqual(1);
    expect(intra.igstPaise).toBe(0);
    const inter = gstSplit({ valuePaise: 118_000, rateBps: 1_800 }, false);
    expect(inter).toEqual({ taxablePaise: 100_000, cgstPaise: 0, sgstPaise: 0, igstPaise: 18_000 });
    expect(gstSplit({ valuePaise: 0, rateBps: 1_800 }, true).taxablePaise).toBe(0);
  });

  it('D-209: same state means CGST + SGST, otherwise IGST', () => {
    expect(isIntraState('Karnataka', ' karnataka')).toBe(true);
    expect(isIntraState('Karnataka', 'Maharashtra')).toBe(false);
    expect(gstRateLabel(1_800)).toBe('18%');
    expect(gstRateLabel(250)).toBe('2.50%');
  });
});

describe('warehouses by speed', () => {
  it('D-203: warehouses by their longest-prefix lane, fastest first (D-63)', () => {
    const lanes = [
      { warehouseId: 'b', pincodePrefix: '', minDays: 5, maxDays: 8 },
      { warehouseId: 'b', pincodePrefix: '56', minDays: 1, maxDays: 2 },
      { warehouseId: 'a', pincodePrefix: '', minDays: 4, maxDays: 6 },
      { warehouseId: 'c', pincodePrefix: '40', minDays: 1, maxDays: 2 },
    ];
    expect(warehousesBySpeed('560034', lanes).map((w) => w.warehouseId)).toEqual(['b', 'a']);
  });
});
