import { describe, expect, it } from 'vitest';
import { toOfferCards } from './toOfferCards';

describe('toOfferCards', () => {
  it('states terms plainly and keeps the not-applicable reason (D-36)', () => {
    expect(
      toOfferCards([
        {
          id: 'c',
          kind: 'coupon',
          name: '₹500 off',
          code: 'WELCOME500',
          minOrderPaise: 499_900,
          validTo: Date.UTC(2026, 9, 31, 12),
          status: 'notApplicable',
          reason: "Coupons don't apply to flash sale prices",
        },
      ]),
    ).toEqual([
      {
        id: 'c',
        kind: 'coupon',
        title: '₹500 off',
        description: 'On orders of ₹4,999 or more. Valid till Sat, 31 Oct.',
        code: 'WELCOME500',
        status: 'notApplicable',
        reason: "Coupons don't apply to flash sale prices",
      },
    ]);
  });
});
