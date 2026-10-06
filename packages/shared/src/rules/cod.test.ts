import { describe, expect, it } from 'vitest';
import { allowedPaymentMethods, codEligibility } from './cod';

const ok = { codAllowedAtPincode: true, isPreorder: false, isFlash: false };

describe('COD', () => {
  it('D-70: COD only where the pincode allows it', () => {
    expect(codEligibility({ lines: [ok], orderTotalPaise: 100 })).toEqual({ allowed: true });
    expect(
      codEligibility({ lines: [ok, { ...ok, codAllowedAtPincode: false }], orderTotalPaise: 100 }),
    ).toEqual({ allowed: false, reasons: ['PINCODE'] });
  });

  it('D-71: no COD for pre-orders or flash sales, all reasons reported', () => {
    expect(
      codEligibility({
        lines: [
          { ...ok, isPreorder: true },
          { ...ok, isFlash: true },
        ],
        orderTotalPaise: 100,
      }),
    ).toEqual({
      allowed: false,
      reasons: ['PREORDER', 'FLASH_SALE'],
    });
  });

  it('D-72: an order-value cap applies only once configured', () => {
    expect(
      codEligibility({ lines: [ok], orderTotalPaise: 5_000_001, capPaise: 5_000_000 }),
    ).toEqual({ allowed: false, reasons: ['ORDER_VALUE'] });
    expect(
      codEligibility({ lines: [ok], orderTotalPaise: 5_000_000, capPaise: 5_000_000 }),
    ).toEqual({ allowed: true });
  });

  it('D-146: pre-orders pay by UPI, card or EMI only', () => {
    const preorder = codEligibility({ lines: [{ ...ok, isPreorder: true }], orderTotalPaise: 100 });
    expect(allowedPaymentMethods(preorder)).toEqual(['upi', 'card', 'emi']);
    expect(allowedPaymentMethods(codEligibility({ lines: [ok], orderTotalPaise: 100 }))).toEqual([
      'upi',
      'card',
      'emi',
      'cod',
    ]);
  });

  it('D-71: flash orders are never offered COD', () => {
    expect(
      allowedPaymentMethods(
        codEligibility({ lines: [{ ...ok, isFlash: true }], orderTotalPaise: 100 }),
      ),
    ).toEqual(['upi', 'card', 'emi']);
  });
});
