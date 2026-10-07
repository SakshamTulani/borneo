import { describe, expect, it } from 'vitest';
import { createDemoCourier, createUnconfiguredCourier } from './index';

describe('courier adapters', () => {
  it('D-215: the demo courier books nothing and derives a tracking number', () => {
    const courier = createDemoCourier();
    expect(courier.available).toBe(true);
    expect(courier.book({ orderId: 'o1', orderNumber: 'BN-000042' })).toEqual({
      name: 'Borneo Express (demo)',
      trackingNo: 'BX00000042IN',
    });
  });

  it('D-215: without a courier integration nothing is booked', () => {
    const courier = createUnconfiguredCourier();
    expect(courier.available).toBe(false);
    expect(() => courier.book({ orderId: 'o1', orderNumber: 'BN-1' })).toThrow('No courier');
  });
});
