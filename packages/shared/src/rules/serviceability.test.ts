import { describe, expect, it } from 'vitest';
import type { DeliveryLane, ServiceabilityRow, WarehouseStock } from '../contracts/delivery';
import { addressNeedsRecheck, deliveryEstimate } from './serviceability';

const now = Date.parse('2026-10-06T06:30:00Z'); // 6 Oct, noon IST
const rows: ServiceabilityRow[] = [
  { pincode: '560001', categoryId: 'smartphones', deliverable: true, codAllowed: true },
  { pincode: '560001', categoryId: 'tvs', deliverable: false, codAllowed: false },
  { pincode: '793001', categoryId: 'smartphones', deliverable: true, codAllowed: false },
];
const lanes: DeliveryLane[] = [
  { warehouseId: 'blr', pincodePrefix: '56', minDays: 1, maxDays: 2 },
  { warehouseId: 'del', pincodePrefix: '', minDays: 3, maxDays: 5 },
  { warehouseId: 'del', pincodePrefix: '79', minDays: 4, maxDays: 7 },
];
const stock: WarehouseStock[] = [
  { warehouseId: 'blr', available: 2 },
  { warehouseId: 'del', available: 10 },
];
const est = (over: Partial<Parameters<typeof deliveryEstimate>[0]> = {}) =>
  deliveryEstimate({
    pincode: '560001',
    categoryId: 'smartphones',
    qty: 1,
    rows,
    stock,
    lanes,
    now,
    ...over,
  });

describe('serviceability', () => {
  it('D-50: invalid pincodes are flagged before lookup', () => {
    expect(est({ pincode: '5600' })).toEqual({ status: 'invalidPincode' });
  });

  it('D-51: not deliverable per pincode × category', () => {
    expect(est({ categoryId: 'tvs' })).toEqual({ status: 'notDeliverable' });
  });

  it('D-62: a missing serviceability row means not deliverable', () => {
    expect(est({ pincode: '110001' })).toEqual({ status: 'notDeliverable' });
  });

  it('D-52: estimate is an IST date range from the fastest stocked warehouse', () => {
    expect(est()).toEqual({
      status: 'deliverable',
      warehouseId: 'blr',
      from: '2026-10-07',
      to: '2026-10-08',
      codAllowed: true,
    });
  });

  it('D-54: availability depends on warehouse stock for the pincode', () => {
    expect(est({ qty: 3 })).toMatchObject({
      warehouseId: 'del',
      from: '2026-10-09',
      to: '2026-10-11',
    });
    expect(est({ stock: [] })).toEqual({ status: 'outOfStockHere' });
  });

  it('D-63: the longest matching lane prefix wins', () => {
    expect(est({ pincode: '793001' })).toEqual({
      status: 'deliverable',
      warehouseId: 'del',
      from: '2026-10-10',
      to: '2026-10-13',
      codAllowed: false,
    });
  });

  it('D-63: no lane to the pincode means not deliverable', () => {
    expect(
      est({ lanes: [{ warehouseId: 'blr', pincodePrefix: '11', minDays: 1, maxDays: 2 }] }),
    ).toEqual({ status: 'notDeliverable' });
  });

  it('D-63: ties break on min days, then warehouse id', () => {
    const tie: DeliveryLane[] = [
      { warehouseId: 'b', pincodePrefix: '56', minDays: 2, maxDays: 3 },
      { warehouseId: 'a', pincodePrefix: '56', minDays: 2, maxDays: 3 },
      { warehouseId: 'c', pincodePrefix: '56', minDays: 1, maxDays: 3 },
    ];
    const s = ['a', 'b', 'c'].map((warehouseId) => ({ warehouseId, available: 1 }));
    expect(est({ lanes: tie, stock: s })).toMatchObject({ warehouseId: 'c' });
    expect(est({ lanes: tie.slice(0, 2), stock: s })).toMatchObject({ warehouseId: 'a' });
  });

  it('D-64: pre-orders count from the expected dispatch date', () => {
    const dispatchFrom = Date.parse('2026-11-01T06:30:00Z');
    expect(est({ dispatchFrom })).toMatchObject({ from: '2026-11-02', to: '2026-11-03' });
    expect(est({ dispatchFrom, stock: [] })).toMatchObject({
      status: 'deliverable',
      from: '2026-11-02',
    });
  });

  it('D-55: recheck when pincode or map pin changes', () => {
    const a = { pincode: '560001', lat: 12.97, lng: 77.59 };
    expect(addressNeedsRecheck(undefined, a)).toBe(true);
    expect(addressNeedsRecheck(a, { ...a })).toBe(false);
    expect(addressNeedsRecheck(a, { ...a, lat: 12.98 })).toBe(true);
    expect(addressNeedsRecheck(a, { ...a, pincode: '560002' })).toBe(true);
  });
});
