import { describe, expect, it } from 'vitest';
import { MAX_CART_LINES, MAX_LINE_QTY } from '../contracts/cart';
import type { EmiPlan } from '../contracts/catalog';
import type { Coupon, FlashSale, PaymentOffer } from '../contracts/offers';
import {
  addEntry,
  bundleKey,
  bundleOffer,
  cartEmiFrom,
  cartReady,
  combineDeliveries,
  itemKey,
  lineMaxQty,
  lineStatus,
  lineSupply,
  mergeCarts,
  normalizeEntries,
  parseLineKey,
  priceCart,
  pricingLines,
  type BundleFacts,
  type ItemFacts,
} from './cart';
import { emiMonthly } from './emi';

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
    {
      productId: 'p-phone',
      categoryId: 'smartphones',
      status: 'live',
      regularPaise: 2_000_000,
      unitsAvailable: 9,
      qty: 1,
    },
    {
      productId: 'p-buds',
      categoryId: 'audio',
      status: 'live',
      regularPaise: 350_000,
      unitsAvailable: 4,
      qty: 2,
    },
  ],
};

const welcome: Coupon = {
  id: 'c1',
  code: 'WELCOME500',
  name: '₹500 off',
  discount: { kind: 'flat', amountPaise: 50_000 },
  minOrderPaise: 499_900,
  ...window,
};
const audio10: Coupon = {
  id: 'c2',
  code: 'AUDIO10',
  name: '10% off audio',
  discount: { kind: 'percent', bps: 1000, maxPaise: 100_000 },
  categoryIds: ['audio'],
  ...window,
};
const hdfc: PaymentOffer = {
  id: 'po1',
  kind: 'bank',
  name: '10% off HDFC cards',
  methods: ['card', 'emi'],
  banks: ['HDFC'],
  discount: { kind: 'percent', bps: 1000, maxPaise: 200_000 },
  minOrderPaise: 1_500_000,
  appliesToAll: true,
  ...window,
};
const noCost: PaymentOffer = {
  id: 'po2',
  kind: 'noCostEmi',
  name: 'No-cost EMI on phones',
  tenureMonths: 6,
  annualRateBps: 1500,
  banks: ['HDFC'],
  categoryIds: ['smartphones'],
  appliesToAll: true,
  ...window,
};
const plans: EmiPlan[] = [
  { id: 'h6', bank: 'HDFC', tenureMonths: 6, annualRateBps: 1500, minAmountPaise: 300_000 },
  { id: 'h12', bank: 'HDFC', tenureMonths: 12, annualRateBps: 1600, minAmountPaise: 300_000 },
];
const book = { coupons: [welcome, audio10], paymentOffers: [hdfc, noCost], emiPlans: plans };

describe('line keys', () => {
  it('reads item and bundle keys and refuses anything else', () => {
    expect(parseLineKey(itemKey('BP4-6-128-FOR'))).toEqual({ kind: 'item', sku: 'BP4-6-128-FOR' });
    expect(parseLineKey(bundleKey('pulse-4-audio-pack'))).toEqual({
      kind: 'bundle',
      slug: 'pulse-4-audio-pack',
    });
    expect(parseLineKey('item:bad sku')).toBeUndefined();
    expect(parseLineKey('variant:X')).toBeUndefined();
  });
});

describe('cart lines', () => {
  it('D-193: one line per key, at most 5 units each, at most 20 lines', () => {
    expect(
      normalizeEntries([
        { key: 'item:A', qty: 2 },
        { key: 'item:A', qty: 4 },
        { key: 'nope', qty: 1 },
        { key: 'item:B', qty: 0 },
        { key: 'item:C', qty: 9 },
      ]),
    ).toEqual([
      { key: 'item:A', qty: MAX_LINE_QTY },
      { key: 'item:C', qty: MAX_LINE_QTY },
    ]);
    const many = Array.from({ length: 25 }, (_, i) => ({ key: `item:S${i}`, qty: 1 }));
    const kept = normalizeEntries(many);
    expect(kept).toHaveLength(MAX_CART_LINES);
    expect(kept[0]!.key).toBe('item:S0');
  });

  it('D-193: adding to a line adds units up to 5; a 21st line is refused', () => {
    const one = addEntry([{ key: 'item:A', qty: 4 }], { key: 'item:A', qty: 3 });
    expect(one).toEqual({ ok: true, entries: [{ key: 'item:A', qty: 5 }] });
    const full = Array.from({ length: MAX_CART_LINES }, (_, i) => ({ key: `item:S${i}`, qty: 1 }));
    expect(addEntry(full, { key: 'item:NEW', qty: 1 })).toEqual({ ok: false, reason: 'CART_FULL' });
    expect(addEntry(full, { key: 'item:S3', qty: 1 }).ok).toBe(true);
  });

  it('D-192: signing in merges the browser cart into the account cart; the browser coupon wins', () => {
    const merged = mergeCarts(
      { entries: [{ key: 'item:A', qty: 1 }], couponCode: 'OLD' },
      {
        entries: [
          { key: 'item:A', qty: 2 },
          { key: 'bundle:kit', qty: 1 },
        ],
        couponCode: 'NEW',
      },
    );
    expect(merged).toEqual({
      entries: [
        { key: 'item:A', qty: 3 },
        { key: 'bundle:kit', qty: 1 },
      ],
      couponCode: 'NEW',
    });
    expect(mergeCarts({ entries: [], couponCode: 'OLD' }, { entries: [] }).couponCode).toBe('OLD');
  });
});

describe('line status and supply', () => {
  it('D-198: discontinued or draft products, ended bundles and bundles with an unsold member are unavailable', () => {
    expect(lineStatus({ ...phone, status: 'discontinued' }, 1, now)).toBe('unavailable');
    expect(lineStatus({ ...phone, status: 'draft' }, 1, now)).toBe('unavailable');
    expect(lineStatus({ ...bundle, activeTo: 4_000 }, 1, now)).toBe('unavailable');
    expect(lineStatus({ ...bundle, activeFrom: 6_000 }, 1, now)).toBe('unavailable');
    const gone = {
      ...bundle,
      members: [{ ...bundle.members[0]!, status: 'discontinued' as const }],
    };
    expect(lineStatus(gone, 1, now)).toBe('unavailable');
  });

  it('D-198: no stock is out of stock; more than we can supply asks for fewer, without a count (D-148)', () => {
    expect(lineStatus({ ...phone, unitsAvailable: 0 }, 1, now)).toBe('outOfStock');
    expect(lineStatus({ ...phone, unitsAvailable: 2 }, 3, now)).toBe('notEnoughStock');
    expect(lineStatus({ ...phone, unitsAvailable: 2 }, 2, now)).toBe('ok');
  });

  it('D-65: pre-orders sell against what is left of the pre-order cap, not warehouse stock', () => {
    const pre: ItemFacts = {
      ...phone,
      status: 'preorder',
      unitsAvailable: 0,
      preorderCap: 10,
      preorderSold: 8,
    };
    expect(lineSupply(pre, now)).toBe(2);
    expect(lineSupply({ ...pre, preorderCap: null }, now)).toBe(0);
    expect(lineSupply({ ...pre, preorderSold: 12 }, now)).toBe(0);
  });

  it('D-197: a bundle supplies as many as its scarcest member allows', () => {
    expect(lineSupply(bundle, now)).toBe(2); // 4 buds, 2 per bundle
  });

  it('D-193: the stepper stops at 5, or at what we can supply', () => {
    expect(lineMaxQty(phone, now)).toBe(5);
    expect(lineMaxQty({ ...phone, unitsAvailable: 3 }, now)).toBe(3);
    expect(lineMaxQty({ ...phone, unitsAvailable: 0 }, now)).toBe(1);
  });
});

describe('pricing lines', () => {
  it('D-194: while a flash sale is live, one unit is at the flash price and the rest regular', () => {
    expect(pricingLines('item:EB2-BLK', 3, buds, now)).toEqual([
      expect.objectContaining({
        lineId: 'item:EB2-BLK#flash',
        qty: 1,
        unitPricePaise: 280_000,
        priceSource: 'flash',
      }),
      expect.objectContaining({
        lineId: 'item:EB2-BLK',
        qty: 2,
        unitPricePaise: 350_000,
        priceSource: 'regular',
      }),
    ]);
    expect(pricingLines('item:EB2-BLK', 1, buds, now)).toHaveLength(1);
  });

  it('D-140: the flash price is not stored; after the sale every unit is regular', () => {
    const after = pricingLines('item:EB2-BLK', 2, buds, 9_000);
    expect(after).toEqual([expect.objectContaining({ qty: 2, priceSource: 'regular' })]);
    const soldOut = pricingLines(
      'item:EB2-BLK',
      1,
      { ...buds, flashSales: [{ ...sale, sold: 40 }] },
      now,
    );
    expect(soldOut[0]!.priceSource).toBe('regular');
  });

  it('D-39: a bundle is one line at the bundle price, never a flash price', () => {
    expect(pricingLines('bundle:kit', 1, bundle, now)).toEqual([
      expect.objectContaining({
        kind: 'bundle',
        priceSource: 'bundle',
        unitPricePaise: 2_100_000,
        categoryIds: ['smartphones', 'audio'],
      }),
    ]);
  });
});

describe('priceCart', () => {
  const entries = [
    { key: 'item:PHONE', qty: 1, facts: phone },
    { key: 'item:EB2-BLK', qty: 2, facts: buds },
  ];

  it('D-36: a coupon skips the flash unit and applies to regular lines', () => {
    const priced = priceCart({ entries, couponCode: 'audio10', ...book, now });
    // Coupon base: one regular buds unit (₹3,500) → 10% = ₹350.
    expect(priced.coupon).toEqual({
      status: 'applied',
      code: 'AUDIO10',
      name: '10% off audio',
      discountPaise: 35_000,
    });
    expect(priced.subtotalPaise).toBe(2_000_000 + 280_000 + 350_000);
    expect(priced.totalPaise).toBe(priced.subtotalPaise - 35_000);
    const budsLine = priced.lines[1]!;
    expect(budsLine.flash).toEqual({ unitPricePaise: 280_000, endsAt: 8_000 });
    expect(budsLine.linePaise).toBe(630_000);
    expect(budsLine.couponDiscountPaise).toBe(35_000);
  });

  it('D-195: a coupon that stops qualifying stays on the cart, not applied, with the reason', () => {
    const small = [{ key: 'item:EB2-BLK', qty: 1, facts: { ...buds, flashSales: [] } }];
    const priced = priceCart({ entries: small, couponCode: 'WELCOME500', ...book, now });
    expect(priced.coupon).toEqual({
      status: 'notApplied',
      code: 'WELCOME500',
      reason: 'Add ₹1,499 more of eligible items to use this coupon.',
    });
    expect(priced.totalPaise).toBe(350_000);
  });

  it('D-195: unknown codes and carts with nothing eligible say why', () => {
    const unknown = priceCart({ entries, couponCode: ' nope ', ...book, now });
    expect(unknown.coupon).toEqual({
      status: 'notApplied',
      code: 'NOPE',
      reason: "This code isn't valid or has ended.",
    });
    const flashOnly = [{ key: 'item:EB2-BLK', qty: 1, facts: buds }];
    const scoped = priceCart({ entries: flashOnly, couponCode: 'AUDIO10', ...book, now });
    expect(scoped.coupon).toMatchObject({
      status: 'notApplied',
      reason: expect.stringContaining('selected categories'),
    });
    const open = priceCart({
      entries: [{ key: 'bundle:kit', qty: 1, facts: bundle }],
      couponCode: 'WELCOME500',
      ...book,
      now,
    });
    expect(open.coupon).toMatchObject({
      reason: "Nothing in your cart qualifies. Coupons don't apply to flash sale or bundle prices.",
    });
    const later = priceCart({
      entries,
      couponCode: 'SOON',
      ...book,
      coupons: [{ ...welcome, code: 'SOON', validFrom: 6_000 }],
      now,
    });
    expect(later.coupon).toMatchObject({ reason: "This coupon isn't active right now." });
  });

  it('D-06: other live coupons are previewed with their saving or reason, never applied', () => {
    const priced = priceCart({ entries, ...book, now });
    expect(priced.coupon).toBeNull();
    expect(priced.totalPaise).toBe(priced.subtotalPaise);
    expect(priced.coupons).toEqual([
      expect.objectContaining({ code: 'WELCOME500', savingPaise: 50_000, reason: null }),
      expect.objectContaining({ code: 'AUDIO10', savingPaise: 35_000, reason: null }),
    ]);
    const withOne = priceCart({ entries, couponCode: 'WELCOME500', ...book, now });
    expect(withOne.coupons.map((c) => c.code)).toEqual(['AUDIO10']);
  });

  it('D-196: payment offers show what they would save at payment; none is selected', () => {
    const priced = priceCart({ entries, couponCode: 'WELCOME500', ...book, now });
    const [bank, emi] = priced.paymentOffers;
    // After the coupon: 2,630,000 − 50,000 = 2,580,000 → 10% capped at ₹2,000.
    expect(bank).toMatchObject({ id: 'po1', savingPaise: 200_000, reason: null });
    // No-cost EMI covers only the phone line.
    expect(emi).toMatchObject({ id: 'po2', kind: 'noCostEmi', reason: null });
    expect(emi!.savingPaise).toBeGreaterThan(0);
    expect(priced.totalPaise).toBe(2_630_000 - 50_000);
  });

  it('D-196: payment offers out of reach say why', () => {
    const small = [{ key: 'item:EB2-BLK', qty: 1, facts: buds }];
    const priced = priceCart({ entries: small, ...book, now });
    expect(priced.paymentOffers).toEqual([
      expect.objectContaining({
        id: 'po1',
        savingPaise: null,
        reason: 'On orders of ₹15,000 or more.',
      }),
      expect.objectContaining({
        id: 'po2',
        savingPaise: null,
        reason: 'Not on the items in your cart.',
      }),
    ]);
  });

  it('D-198: lines that cannot be bought stay listed but out of the totals; checkout waits', () => {
    const priced = priceCart({
      entries: [
        ...entries,
        { key: 'item:OLD', qty: 1, facts: { ...phone, status: 'discontinued' } },
      ],
      ...book,
      now,
    });
    expect(priced.lines[2]).toMatchObject({ status: 'unavailable', linePaise: 0 });
    expect(priced.subtotalPaise).toBe(2_630_000);
    expect(priced.canCheckout).toBe(false);
    expect(priceCart({ entries, ...book, now }).canCheckout).toBe(true);
    expect(priceCart({ entries: [], ...book, now }).canCheckout).toBe(false);
  });

  it('D-198: a line asking for more than we can supply is priced but blocks checkout', () => {
    const priced = priceCart({
      entries: [{ key: 'item:PHONE', qty: 3, facts: { ...phone, unitsAvailable: 2 } }],
      ...book,
      now,
    });
    expect(priced.lines[0]).toMatchObject({
      status: 'notEnoughStock',
      maxQty: 2,
      linePaise: 6_000_000,
    });
    expect(priced.canCheckout).toBe(false);
  });

  it('D-146: pre-order lines are marked', () => {
    const pre: ItemFacts = { ...phone, status: 'preorder', preorderCap: 5 };
    expect(
      priceCart({ entries: [{ key: 'item:P', qty: 1, facts: pre }], ...book, now }).lines[0]!
        .isPreorder,
    ).toBe(true);
  });
});

describe('cart EMI', () => {
  const phoneLine = pricingLines('item:PHONE', 1, phone, now);
  const mixed = [
    ...phoneLine,
    ...pricingLines('item:EB2-BLK', 1, { ...buds, flashSales: [] }, now),
  ];

  it('D-47: a no-cost plan is interest-free only when its offer covers every line', () => {
    const sixOnly = { ...book, emiPlans: [plans[0]!] };
    const covered = cartEmiFrom({ totalPaise: 2_000_000, lines: phoneLine, ...sixOnly, now });
    expect(covered).toBe(333_333); // ₹20,000 ÷ 6, no interest
    const partial = cartEmiFrom({ totalPaise: 2_350_000, lines: mixed, ...sixOnly, now });
    expect(partial).toBe(emiMonthly(2_350_000, 6, 1500));
  });

  it('D-33: no EMI line on an empty total, or when the offer has ended or the total is below its minimum', () => {
    expect(cartEmiFrom({ totalPaise: 0, lines: [], ...book, now })).toBeUndefined();
    const ended = cartEmiFrom({ totalPaise: 2_000_000, lines: phoneLine, ...book, now: 20_000 });
    expect(ended).toBe(emiMonthly(2_000_000, 12, 1600));
    const min = { ...noCost, minOrderPaise: 3_000_000 };
    expect(
      cartEmiFrom({ totalPaise: 2_000_000, lines: phoneLine, ...book, paymentOffers: [min], now }),
    ).toBe(emiMonthly(2_000_000, 12, 1600));
  });
});

describe('delivery and bundles', () => {
  it('D-55: a bundle arrives when its last member does; any gap blocks it', () => {
    expect(
      combineDeliveries([
        { status: 'deliverable', from: '2026-10-08', to: '2026-10-09' },
        { status: 'deliverable', from: '2026-10-07', to: '2026-10-11' },
      ]),
    ).toEqual({ status: 'deliverable', from: '2026-10-08', to: '2026-10-11' });
    expect(
      combineDeliveries([
        { status: 'deliverable', from: '2026-10-08', to: '2026-10-09' },
        { status: 'outOfStockHere' },
      ]),
    ).toEqual({ status: 'outOfStockHere' });
    expect(combineDeliveries([{ status: 'outOfStockHere' }, { status: 'notDeliverable' }])).toEqual(
      {
        status: 'notDeliverable',
      },
    );
  });

  it('D-197: a bundle shows only while buyable and only with a real saving against regular prices', () => {
    expect(bundleOffer(bundle, now)).toEqual({
      pricePaise: 2_100_000,
      separatePaise: 2_700_000,
      savingPaise: 600_000,
    });
    expect(bundleOffer({ ...bundle, pricePaise: 2_700_000 }, now)).toBeUndefined();
    expect(bundleOffer({ ...bundle, activeTo: 1_000 }, now)).toBeUndefined();
    const short = { ...bundle, members: [{ ...bundle.members[1]!, unitsAvailable: 1 }] };
    expect(bundleOffer(short, now)).toBeUndefined();
  });
});

describe('checkout readiness', () => {
  it('D-55: with a pincode, every line must be deliverable there; D-198: every line buyable', () => {
    const ok = { status: 'deliverable' as const, from: '2026-10-08', to: '2026-10-09' };
    expect(cartReady(true, [ok, null])).toBe(true);
    expect(cartReady(true, [ok, { status: 'notDeliverable' }])).toBe(false);
    expect(cartReady(true, [{ status: 'outOfStockHere' }])).toBe(false);
    expect(cartReady(false, [ok])).toBe(false);
  });
});

describe('flash and stock limits', () => {
  it('D-142: only one unit per cart line is ever at the flash price', () => {
    const lines = pricingLines('item:EB2-BLK', 5, buds, now);
    expect(lines.filter((l) => l.priceSource === 'flash').map((l) => l.qty)).toEqual([1]);
  });

  it('D-148: a short line gets a status, never a count of what is left', () => {
    const priced = priceCart({
      entries: [{ key: 'item:PHONE', qty: 4, facts: { ...phone, unitsAvailable: 3 } }],
      ...book,
      now,
    });
    expect(priced.lines[0]!.status).toBe('notEnoughStock');
    expect(Object.keys(priced.lines[0]!)).not.toContain('unitsLeft');
  });
});
