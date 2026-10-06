import { describe, expect, it } from 'vitest';
import { cartLineSchema } from './cart';
import { isValidPincode, paiseSchema } from './common';
import { deliveryLaneSchema } from './delivery';
import { flashSaleSchema } from './offers';

describe('contracts', () => {
  it('D-41: paise are non-negative integers', () => {
    expect(paiseSchema.safeParse(100).success).toBe(true);
    expect(paiseSchema.safeParse(1.5).success).toBe(false);
    expect(paiseSchema.safeParse(-1).success).toBe(false);
  });

  it('D-50: pincodes are 6 digits not starting with 0', () => {
    expect(isValidPincode('560001')).toBe(true);
    expect(isValidPincode('060001')).toBe(false);
    expect(isValidPincode('5600')).toBe(false);
  });

  it('D-39: bundle lines use bundle prices and item lines never do', () => {
    const base = { lineId: 'l', categoryIds: ['audio'], qty: 1, unitPricePaise: 100 };
    expect(
      cartLineSchema.safeParse({ ...base, kind: 'bundle', priceSource: 'flash' }).success,
    ).toBe(false);
    expect(cartLineSchema.safeParse({ ...base, kind: 'item', priceSource: 'bundle' }).success).toBe(
      false,
    );
    expect(
      cartLineSchema.safeParse({ ...base, kind: 'bundle', priceSource: 'bundle' }).success,
    ).toBe(true);
  });

  it('D-140: a flash sale must end after it starts and allows 1 per customer', () => {
    const sale = {
      id: 'f',
      variantId: 'v',
      salePricePaise: 1,
      startsAt: 10,
      endsAt: 5,
      cap: 1,
      sold: 0,
      perCustomerLimit: 1,
    };
    expect(flashSaleSchema.safeParse(sale).success).toBe(false);
    expect(flashSaleSchema.safeParse({ ...sale, endsAt: 20, perCustomerLimit: 2 }).success).toBe(
      false,
    );
  });

  it('D-63: lane max days cannot be below min days', () => {
    expect(
      deliveryLaneSchema.safeParse({
        warehouseId: 'w',
        pincodePrefix: '56',
        minDays: 3,
        maxDays: 2,
      }).success,
    ).toBe(false);
  });
});
