import type { DeliveryCheck } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { deliveryViewFor, toDeliveryView, toPinnedPincode } from './toDeliveryView';

const place = { city: 'Bengaluru', state: 'Karnataka' };
const deliverable = (cod: {
  allowed: boolean;
  reasons: ('PINCODE' | 'PREORDER' | 'FLASH_SALE' | 'ORDER_VALUE')[];
}): DeliveryCheck => ({
  pincode: '560001',
  place,
  estimate: { status: 'deliverable', from: '2026-10-07', to: '2026-10-08', cod },
});

describe('toDeliveryView', () => {
  it('D-52: a deliverable estimate keeps its range and names the place', () => {
    expect(toDeliveryView(deliverable({ allowed: true, reasons: [] }))).toEqual({
      state: { status: 'deliverable', from: '2026-10-07', to: '2026-10-08', cod: true },
      place: 'Bengaluru, Karnataka',
    });
  });

  it('D-186: says why COD is off, pre-order first', () => {
    const note = (reasons: ('PINCODE' | 'PREORDER' | 'FLASH_SALE')[]) => {
      const v = toDeliveryView(deliverable({ allowed: false, reasons }));
      return v.state.status === 'deliverable' ? v.state.codNote : undefined;
    };
    expect(note(['PINCODE', 'PREORDER'])).toBe('Pre-orders are paid online; no cash on delivery');
    expect(note(['FLASH_SALE'])).toBe('Flash sale price is paid online; no cash on delivery');
    expect(note(['PINCODE'])).toBe('Cash on delivery not available here');
  });

  it('D-51: not deliverable and out of stock here keep the place when known', () => {
    expect(
      toDeliveryView({ pincode: '171001', place: null, estimate: { status: 'notDeliverable' } }),
    ).toEqual({ state: { status: 'notDeliverable' } });
    expect(
      toDeliveryView({ pincode: '560001', place, estimate: { status: 'outOfStockHere' } }),
    ).toEqual({ state: { status: 'outOfStockHere' }, place: 'Bengaluru, Karnataka' });
  });

  it('D-50: an invalid pincode becomes a field error', () => {
    expect(
      toDeliveryView({ pincode: '12', place: null, estimate: { status: 'invalidPincode' } }).state,
    ).toEqual({ status: 'invalid', message: 'Enter a 6-digit pincode' });
  });

  it('D-184: a pinned pincode carries its place name', () => {
    expect(
      toPinnedPincode({ pincode: '560034', city: 'Bengaluru', state: 'Karnataka', lat: 1, lng: 2 }),
    ).toEqual({ pincode: '560034', place: 'Bengaluru, Karnataka' });
  });
});

describe('deliveryViewFor', () => {
  const base = { pincode: '560001', validPincode: true, data: undefined, isError: false };
  it('idle before any pincode, checking while loading, error on failure', () => {
    expect(deliveryViewFor({ ...base, pincode: null }).state).toEqual({ status: 'idle' });
    expect(deliveryViewFor(base).state).toEqual({ status: 'checking' });
    expect(deliveryViewFor({ ...base, isError: true }).state).toEqual({ status: 'error' });
  });

  it('D-50: a malformed pincode never waits on the API', () => {
    expect(deliveryViewFor({ ...base, pincode: '56', validPincode: false }).state).toEqual({
      status: 'invalid',
      message: 'Enter a 6-digit pincode',
    });
  });
});
