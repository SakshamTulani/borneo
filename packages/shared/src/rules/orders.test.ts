import { describe, expect, it } from 'vitest';
import { canCustomerCancel } from './orders';

describe('orders', () => {
  it('D-146: pre-orders cancel free before dispatch', () => {
    expect(canCustomerCancel('paid')).toBe(true);
    expect(canCustomerCancel('shipped')).toBe(false);
  });

  it('D-149: customers cancel until the order ships', () => {
    for (const s of ['pending_payment', 'paid', 'confirmed', 'packed'] as const)
      expect(canCustomerCancel(s)).toBe(true);
    for (const s of ['shipped', 'delivered', 'cancelled', 'refunded'] as const)
      expect(canCustomerCancel(s)).toBe(false);
  });
});
