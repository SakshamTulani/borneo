import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../time';
import {
  cancelOutcome,
  cancelText,
  linePaidPaise,
  nextDemoReturnStatus,
  nextDemoStep,
  ownedProducts,
  photoProblem,
  photoType,
  RETURN_PHOTO_MAX_BYTES,
  returnOptions,
  returnRefundPaise,
  reviewPrompts,
  statusAfterStep,
  trackingTimeline,
  WATCH_MAX,
} from './postPurchase';

const T = Date.parse('2026-10-01T06:30:00.000Z');
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const webp = new Uint8Array(
  [...'RIFF']
    .map((c) => c.charCodeAt(0))
    .concat(
      [0, 0, 0, 0],
      [...'WEBP'].map((c) => c.charCodeAt(0)),
    ),
);

describe('tracking', () => {
  it('D-215: steps reached carry their time; the next one is current while moving', () => {
    const steps = trackingTimeline('packed', [
      { step: 'placed', at: T },
      { step: 'confirmed', at: T },
      { step: 'packed', at: T + 1000 },
    ]);
    expect(steps.map((s) => s.state)).toEqual([
      'done',
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(steps[2]!.at).toBe(T + 1000);
    expect(steps[3]!.at).toBeNull();
  });

  it('D-215: nothing is current once delivered or cancelled', () => {
    const cancelled = trackingTimeline('cancelled', [{ step: 'placed', at: T }]);
    expect(cancelled.some((s) => s.state === 'current')).toBe(false);
    const delivered = trackingTimeline(
      'delivered',
      ['placed', 'confirmed', 'packed', 'shipped', 'outForDelivery', 'delivered'].map((step) => ({
        step: step as 'placed',
        at: T,
      })),
    );
    expect(delivered.every((s) => s.state === 'done')).toBe(true);
  });

  it('D-215: the demo courier moves one step at a time; out for delivery keeps the order shipped', () => {
    expect(nextDemoStep('confirmed', [])).toBe('packed');
    expect(nextDemoStep('packed', [])).toBe('shipped');
    expect(nextDemoStep('shipped', [])).toBe('outForDelivery');
    expect(nextDemoStep('shipped', [{ step: 'outForDelivery', at: T }])).toBe('delivered');
    for (const s of ['pending_payment', 'delivered', 'cancelled', 'refunded'] as const)
      expect(nextDemoStep(s, [])).toBeNull();
    expect(statusAfterStep('outForDelivery', 'shipped')).toBe('shipped');
    expect(statusAfterStep('delivered', 'shipped')).toBe('delivered');
    expect(statusAfterStep('packed', 'confirmed')).toBe('packed');
    expect(statusAfterStep('placed', 'confirmed')).toBe('confirmed');
  });
});

describe('cancelling', () => {
  it('D-149: only until the order ships', () => {
    expect(cancelOutcome({ status: 'shipped', prepaid: true, totalPaise: 100 })).toEqual({
      ok: false,
    });
    expect(cancelOutcome({ status: 'packed', prepaid: true, totalPaise: 100 }).ok).toBe(true);
  });

  it('D-216: a paid order is refunded in full; unpaid and cash-on-delivery orders owe nothing', () => {
    expect(cancelOutcome({ status: 'confirmed', prepaid: true, totalPaise: 4999_00 })).toEqual({
      ok: true,
      refundPaise: 4999_00,
    });
    expect(cancelOutcome({ status: 'pending_payment', prepaid: true, totalPaise: 100 })).toEqual({
      ok: true,
      refundPaise: 0,
    });
    expect(cancelOutcome({ status: 'confirmed', prepaid: false, totalPaise: 100 })).toEqual({
      ok: true,
      refundPaise: 0,
    });
    expect(cancelText(4999_00, true)).toContain('₹4,999');
    expect(cancelText(0, true)).toContain('Nothing was charged');
    expect(cancelText(0, false)).toContain('cash on delivery');
  });
});

describe('returns', () => {
  const delivered = T;
  it('D-86: a delivered line offers what its policy allows; nothing before delivery', () => {
    expect(
      returnOptions({ policy: 'return', deliveredAt: undefined, now: T, hasOpenRequest: false }),
    ).toEqual([]);
    expect(
      returnOptions({ policy: 'return', deliveredAt: delivered, now: T, hasOpenRequest: false }),
    ).toEqual([
      { kind: 'return', reasons: ['defect', 'damage', 'changedMind', 'other'] },
      { kind: 'replacement', reasons: ['defect', 'damage'] },
    ]);
  });

  it('D-81: replacement-only categories offer a replacement for defect or damage only', () => {
    expect(
      returnOptions({
        policy: 'replacementOnly',
        deliveredAt: delivered,
        now: T,
        hasOpenRequest: false,
      }),
    ).toEqual([{ kind: 'replacement', reasons: ['defect', 'damage'] }]);
  });

  it('D-89: options follow the policy passed in, not the category', () => {
    const a = returnOptions({ policy: 'return', deliveredAt: T, now: T, hasOpenRequest: false });
    const b = returnOptions({
      policy: 'replacementOnly',
      deliveredAt: T,
      now: T,
      hasOpenRequest: false,
    });
    expect(a).not.toEqual(b);
  });

  it('D-87: nothing once the window has closed', () => {
    expect(
      returnOptions({
        policy: 'return',
        deliveredAt: delivered,
        now: delivered + 9 * DAY_MS,
        hasOpenRequest: false,
      }),
    ).toEqual([]);
  });

  it('D-217: one open request per line; photos are checked by content, count and size', () => {
    expect(
      returnOptions({ policy: 'return', deliveredAt: T, now: T, hasOpenRequest: true }),
    ).toEqual([]);
    expect(photoType(jpeg)).toBe('image/jpeg');
    expect(photoType(png)).toBe('image/png');
    expect(photoType(webp)).toBe('image/webp');
    expect(photoType(new TextEncoder().encode('<svg></svg>'))).toBeNull();
    expect(photoProblem([jpeg, png, webp, jpeg], true)).toBe('TOO_MANY_PHOTOS');
    const big = new Uint8Array(RETURN_PHOTO_MAX_BYTES + 1);
    big.set(jpeg);
    expect(photoProblem([big], true)).toBe('PHOTO_TOO_LARGE');
    expect(photoProblem([new Uint8Array([1, 2, 3])], false)).toBe('PHOTO_NOT_IMAGE');
    expect(photoProblem([jpeg, png], true)).toBeNull();
  });

  it('D-88: defect or damage needs at least one photo; change of mind does not', () => {
    expect(photoProblem([], true)).toBe('PHOTOS_REQUIRED');
    expect(photoProblem([], false)).toBeNull();
  });

  it('D-219: requests move requested → approved → completed; a return refunds what the line cost', () => {
    expect(nextDemoReturnStatus('requested')).toBe('approved');
    expect(nextDemoReturnStatus('approved')).toBe('completed');
    expect(nextDemoReturnStatus('completed')).toBeNull();
    expect(nextDemoReturnStatus('rejected')).toBeNull();
    const paid = linePaidPaise({ unitPricePaise: 1000_00, qty: 2, discountPaise: 150_00 });
    expect(paid).toBe(1850_00);
    expect(returnRefundPaise({ kind: 'return', prepaid: true, linePaidPaise: paid })).toBe(paid);
    expect(returnRefundPaise({ kind: 'return', prepaid: false, linePaidPaise: paid })).toBe(0);
    expect(returnRefundPaise({ kind: 'replacement', prepaid: true, linePaidPaise: paid })).toBe(0);
  });
});

const line = (productId: string, deliveredAt: number, returned = false) => ({
  orderItemId: `${productId}@${deliveredAt}`,
  productId,
  deliveredAt,
  returned,
});

describe('owned devices and reviews', () => {
  it('D-24: owned devices come only from delivered lines', () => {
    expect(ownedProducts([])).toEqual([]);
    expect(ownedProducts([line('a', T)]).map((l) => l.productId)).toEqual(['a']);
  });

  it('D-220: one entry per product, newest first, returned lines left out', () => {
    const owned = ownedProducts([
      line('a', T),
      line('b', T + DAY_MS),
      line('a', T + 2 * DAY_MS),
      line('c', T + 3 * DAY_MS, true),
    ]);
    expect(owned.map((l) => l.orderItemId)).toEqual([`a@${T + 2 * DAY_MS}`, `b@${T + DAY_MS}`]);
  });

  it('D-151: prompts come from delivered products', () => {
    expect(reviewPrompts([line('a', T)], new Set()).map((l) => l.productId)).toEqual(['a']);
  });

  it('D-221: one prompt per product not yet reviewed, returned items included', () => {
    const prompts = reviewPrompts(
      [line('a', T), line('a', T + DAY_MS), line('b', T, true), line('c', T)],
      new Set(['c']),
    );
    expect(prompts.map((l) => l.orderItemId)).toEqual([`a@${T + DAY_MS}`, `b@${T}`]);
  });

  it('D-222: a customer watches at most 50 variants', () => {
    expect(WATCH_MAX).toBe(50);
  });
});
