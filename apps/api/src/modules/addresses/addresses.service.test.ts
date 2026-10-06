import { addressInputSchema, MAX_ADDRESSES, toCustomerId } from '@borneo/shared';
import { describe, expect, it, vi } from 'vitest';
import { emptyAddressesDeps } from '../../test/factories';
import type { AddressRow } from './addresses.repository';
import { createAddressesService } from './addresses.service';

const customerId = toCustomerId('c1');
const input = addressInputSchema.parse({
  name: 'Asha Rao',
  phone: '9876543210',
  line1: '12, 4th Cross',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560034',
  lat: 12.9352,
  lng: 77.6245,
});

const row = (id: string, over: Partial<AddressRow> = {}): AddressRow => ({
  ...input,
  id,
  customerId,
  isDefault: false,
  createdAt: new Date('2026-10-01'),
  ...over,
});

describe('addresses service', () => {
  it('D-188: the first address becomes the default', async () => {
    const service = createAddressesService(
      emptyAddressesDeps({ insert: async (_c, _v, decide) => row('a', { isDefault: decide(0) }) }),
    );
    expect((await service.create(customerId, input)).isDefault).toBe(true);
  });

  it('D-188: later addresses are not the default unless asked', async () => {
    const service = createAddressesService(
      emptyAddressesDeps({ insert: async (_c, _v, decide) => row('b', { isDefault: decide(1) }) }),
    );
    expect((await service.create(customerId, input)).isDefault).toBe(false);
    expect((await service.create(customerId, { ...input, isDefault: true })).isDefault).toBe(true);
  });

  it(`D-188: no more than ${MAX_ADDRESSES} addresses`, async () => {
    const service = createAddressesService(
      emptyAddressesDeps({
        insert: async (_c, _v, decide) => row('x', { isDefault: decide(MAX_ADDRESSES) }),
      }),
    );
    await expect(service.create(customerId, input)).rejects.toMatchObject({
      statusCode: 422,
      code: 'ADDRESS_LIMIT',
    });
  });

  it('D-189: a pin far from a known pincode is refused', async () => {
    const service = createAddressesService(
      emptyAddressesDeps({ pincodeCentre: async () => ({ lat: 12.9279, lng: 77.6271 }) }),
    );
    await expect(
      service.create(customerId, { ...input, lat: 12.3, lng: 76.65 }),
    ).rejects.toMatchObject({ statusCode: 422, code: 'PIN_FAR_FROM_PINCODE' });
  });

  it('D-188: deleting passes the newest-remaining rule to the store', async () => {
    const remove = vi.fn(
      async (
        _c: string,
        _id: string,
        _pick: (r: { id: string; createdAt: Date }[]) => string | null,
      ) => true,
    );
    const service = createAddressesService(emptyAddressesDeps({ remove }));
    await service.remove(customerId, 'gone');
    const pick = remove.mock.calls[0]![2] as (
      r: { id: string; createdAt: Date }[],
    ) => string | null;
    expect(
      pick([
        { id: 'old', createdAt: new Date('2026-01-01') },
        { id: 'new', createdAt: new Date('2026-06-01') },
      ]),
    ).toBe('new');
  });

  it('a missing address is 404', async () => {
    const service = createAddressesService(emptyAddressesDeps());
    for (const call of [
      service.update(customerId, 'nope', input),
      service.setDefault(customerId, 'nope'),
      service.remove(customerId, 'nope'),
    ]) {
      await expect(call).rejects.toMatchObject({ statusCode: 404, code: 'ADDRESS_NOT_FOUND' });
    }
  });
});
