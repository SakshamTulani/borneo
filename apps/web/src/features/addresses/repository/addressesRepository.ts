import { queryOptions } from '@tanstack/react-query';
import type { Address, AddressInput } from '@borneo/shared';
import {
  deleteAddress,
  getAddresses,
  postAddress,
  postDefault,
  putAddress,
} from '../api/addressesApi';

/** The address book (D-188), default first. Under `['me']`: dropped when the session changes. */
export const addressesQuery = queryOptions({
  queryKey: ['me', 'addresses'],
  queryFn: async (): Promise<Address[]> => (await getAddresses()).items,
  staleTime: 60_000,
});

export const saveAddress = ({ id, input }: { id?: string; input: AddressInput }) =>
  id ? putAddress(id, input) : postAddress(input);

export const removeAddress = deleteAddress;
export const makeDefault = postDefault;

/** The pincode the PDP starts from when signed in (D-185). */
export const defaultPincode = (addresses: Address[]): string | null =>
  addresses.find((a) => a.isDefault)?.pincode ?? null;
