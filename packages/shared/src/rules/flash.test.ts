import { describe, expect, it } from 'vitest';
import type { FlashSale } from '../contracts/offers';
import {
  canBuyFlash,
  flashState,
  isDisposableEmail,
  lowStockCount,
  unitPriceWithFlash,
} from './flash';

const sale: FlashSale = {
  id: 'f1',
  variantId: 'v1',
  salePricePaise: 1_999_900,
  startsAt: 1_000,
  endsAt: 2_000,
  cap: 100,
  sold: 10,
  perCustomerLimit: 1,
};
const domains = new Set(['mailinator.com', 'tempmail.dev']);
const buy = (over: Partial<Parameters<typeof canBuyFlash>[0]> = {}) =>
  canBuyFlash({
    sale,
    now: 1_500,
    qty: 1,
    alreadyBought: 0,
    email: 'a@example.in',
    disposableDomains: domains,
    ...over,
  });

describe('flash sales', () => {
  it('D-140: state follows the real window and real cap', () => {
    expect(flashState(sale, 999)).toBe('upcoming');
    expect(flashState(sale, 1_000)).toBe('live');
    expect(flashState({ ...sale, sold: 100 }, 1_500)).toBe('soldOut');
    expect(flashState(sale, 2_000)).toBe('ended');
  });

  it('D-140: flash price only while live; price returns to normal after', () => {
    expect(unitPriceWithFlash(2_499_900, sale, 1_500)).toEqual({
      paise: 1_999_900,
      source: 'flash',
    });
    expect(unitPriceWithFlash(2_499_900, sale, 2_000)).toEqual({
      paise: 2_499_900,
      source: 'regular',
    });
    expect(unitPriceWithFlash(2_499_900, { ...sale, sold: 100 }, 1_500).source).toBe('regular');
    expect(unitPriceWithFlash(2_499_900, undefined, 1_500).source).toBe('regular');
  });

  it('D-148: "only N left" only from the real remaining cap at or below 5, and only while live', () => {
    expect(lowStockCount(sale, 1_500)).toBeUndefined();
    expect(lowStockCount({ ...sale, sold: 95 }, 1_500)).toBe(5);
    expect(lowStockCount({ ...sale, sold: 99 }, 1_500)).toBe(1);
    expect(lowStockCount({ ...sale, sold: 99 }, 2_000)).toBeUndefined();
  });

  it('D-142: limit 1 per customer', () => {
    expect(buy()).toEqual({ ok: true });
    expect(buy({ alreadyBought: 1 })).toEqual({ ok: false, reason: 'LIMIT_REACHED' });
    expect(buy({ qty: 2 })).toEqual({ ok: false, reason: 'QTY_OVER_LIMIT' });
  });

  it('D-140: the last unit can be bought; then it is sold out', () => {
    expect(buy({ sale: { ...sale, sold: 99 } })).toEqual({ ok: true });
    expect(buy({ sale: { ...sale, sold: 100 } })).toEqual({ ok: false, reason: 'SOLD_OUT' });
  });

  it('D-140: cannot buy before start, after end or when sold out', () => {
    expect(buy({ now: 999 })).toEqual({ ok: false, reason: 'NOT_STARTED' });
    expect(buy({ now: 2_000 })).toEqual({ ok: false, reason: 'ENDED' });
    expect(buy({ sale: { ...sale, sold: 100 } })).toEqual({ ok: false, reason: 'SOLD_OUT' });
  });

  it('D-143: disposable email domains are blocked, including subdomains', () => {
    expect(buy({ email: 'x@Mailinator.com' })).toEqual({ ok: false, reason: 'DISPOSABLE_EMAIL' });
    expect(isDisposableEmail('x@inbox.tempmail.dev', domains)).toBe(true);
    expect(isDisposableEmail('x@gmail.com', domains)).toBe(false);
    expect(isDisposableEmail('not-an-email', domains)).toBe(false);
    expect(isDisposableEmail('a@b@mailinator.com', domains)).toBe(true);
  });
});
