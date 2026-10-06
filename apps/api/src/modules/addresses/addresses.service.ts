import {
  canAddAddress,
  defaultAfterDelete,
  isDefaultOnAdd,
  MAX_ADDRESSES,
  pinMatchesPincode,
  PIN_MAX_KM_FROM_PINCODE,
  type Address,
  type AddressFields,
  type CustomerId,
  type GeoPoint,
} from '@borneo/shared';
import { AppError, notFound } from '../../errors';
import type { AddressRow, AddressValues } from './addresses.repository';

export type AddressesDeps = {
  list: (customerId: CustomerId) => Promise<AddressRow[]>;
  /** `decide(existing)` runs under the customer's lock and returns whether it is the default. */
  insert: (
    customerId: CustomerId,
    values: AddressValues,
    decide: (existing: number) => boolean,
  ) => Promise<AddressRow>;
  update: (
    customerId: CustomerId,
    id: string,
    values: AddressValues,
  ) => Promise<AddressRow | undefined>;
  setDefault: (customerId: CustomerId, id: string) => Promise<boolean>;
  remove: (
    customerId: CustomerId,
    id: string,
    nextDefault: (remaining: { id: string; createdAt: Date }[]) => string | null,
  ) => Promise<boolean>;
  /** Centre of a known pincode (delivery module). */
  pincodeCentre: (pincode: string) => Promise<GeoPoint | undefined>;
};

const toAddress = (row: AddressRow): Address => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  line1: row.line1,
  line2: row.line2,
  landmark: row.landmark,
  city: row.city,
  state: row.state,
  pincode: row.pincode,
  lat: row.lat,
  lng: row.lng,
  isDefault: row.isDefault,
});

const missing = () => notFound('ADDRESS_NOT_FOUND', 'No such address');

/** The address book (D-53, D-188, D-189). Another customer's address is simply not found. */
export function createAddressesService(deps: AddressesDeps) {
  async function checkPin({
    isDefault: _default,
    ...values
  }: AddressFields): Promise<AddressValues> {
    const centre = (await deps.pincodeCentre(values.pincode)) ?? null;
    if (!pinMatchesPincode(values, centre)) {
      throw new AppError(
        422,
        'PIN_FAR_FROM_PINCODE',
        `The map pin is more than ${PIN_MAX_KM_FROM_PINCODE} km from pincode ${values.pincode}. Move the pin or check the pincode.`,
      );
    }
    return values;
  }

  return {
    list: async (customerId: CustomerId) => (await deps.list(customerId)).map(toAddress),

    async create(customerId: CustomerId, input: AddressFields): Promise<Address> {
      const values = await checkPin(input);
      const row = await deps.insert(customerId, values, (existing) => {
        if (!canAddAddress(existing)) {
          throw new AppError(
            422,
            'ADDRESS_LIMIT',
            `You can save up to ${MAX_ADDRESSES} addresses.`,
          );
        }
        return isDefaultOnAdd(existing, input.isDefault);
      });
      return toAddress(row);
    },

    /** Edits the address; `isDefault: true` also makes it the default (it is never unset here). */
    async update(customerId: CustomerId, id: string, input: AddressFields): Promise<Address> {
      const values = await checkPin(input);
      const row = await deps.update(customerId, id, values);
      if (!row) throw missing();
      if (input.isDefault && !row.isDefault) {
        await deps.setDefault(customerId, id);
        return toAddress({ ...row, isDefault: true });
      }
      return toAddress(row);
    },

    async setDefault(customerId: CustomerId, id: string): Promise<void> {
      if (!(await deps.setDefault(customerId, id))) throw missing();
    },

    async remove(customerId: CustomerId, id: string): Promise<void> {
      if (!(await deps.remove(customerId, id, defaultAfterDelete))) throw missing();
    },
  };
}

export type AddressesService = ReturnType<typeof createAddressesService>;
