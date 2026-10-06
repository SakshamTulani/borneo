import { describe, expect, it } from 'vitest';
import { addressInputSchema } from '../contracts/addresses';
import {
  canAddAddress,
  defaultAfterDelete,
  isDefaultOnAdd,
  isPinInIndia,
  MAX_ADDRESSES,
  pinMatchesPincode,
} from './addresses';

const koramangala = { lat: 12.9352, lng: 77.6245 };
const address = {
  name: 'Asha Rao',
  phone: '98765 43210',
  line1: '12, 4th Cross',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560034',
  ...koramangala,
};

describe('addresses', () => {
  it('D-53: an address needs its map pin', () => {
    expect(addressInputSchema.safeParse({ ...address, lat: undefined }).success).toBe(false);
    expect(addressInputSchema.parse(address)).toMatchObject({
      ...koramangala,
      phone: '9876543210',
      line2: null,
      landmark: null,
      isDefault: false,
    });
  });

  it('D-189: the pin must be in India', () => {
    expect(isPinInIndia(koramangala)).toBe(true);
    expect(isPinInIndia({ lat: 11.62, lng: 92.73 })).toBe(true); // Port Blair
    expect(isPinInIndia({ lat: 51.5, lng: -0.12 })).toBe(false);
    expect(addressInputSchema.safeParse({ ...address, lat: 51.5, lng: -0.12 }).success).toBe(false);
  });

  it('D-189: the pin must be within 50 km of a known pincode centre', () => {
    const centre = { lat: 12.93, lng: 77.63 };
    expect(pinMatchesPincode(koramangala, centre)).toBe(true);
    expect(pinMatchesPincode({ lat: 13.2, lng: 77.7 }, centre)).toBe(true); // ~31 km
    expect(pinMatchesPincode({ lat: 12.3, lng: 76.65 }, centre)).toBe(false); // Mysuru, ~125 km
    // Unknown pincode: nothing to compare, any pin in India will do.
    expect(pinMatchesPincode({ lat: 28.6, lng: 77.2 }, null)).toBe(true);
    expect(pinMatchesPincode({ lat: 51.5, lng: -0.12 }, null)).toBe(false);
  });

  it(`D-188: up to ${MAX_ADDRESSES} addresses`, () => {
    expect(canAddAddress(MAX_ADDRESSES - 1)).toBe(true);
    expect(canAddAddress(MAX_ADDRESSES)).toBe(false);
  });

  it('D-188: the first address is the default; later ones only when asked', () => {
    expect(isDefaultOnAdd(0, false)).toBe(true);
    expect(isDefaultOnAdd(2, false)).toBe(false);
    expect(isDefaultOnAdd(2, true)).toBe(true);
  });

  it('D-188: deleting the default promotes the newest remaining address', () => {
    expect(
      defaultAfterDelete([
        { id: 'old', createdAt: new Date('2026-01-01') },
        { id: 'new', createdAt: new Date('2026-05-01') },
        { id: 'mid', createdAt: new Date('2026-03-01') },
      ]),
    ).toBe('new');
    expect(defaultAfterDelete([])).toBeNull();
  });
});
