import {
  addressListSchema,
  addressSchema,
  type Address,
  type AddressInput,
  type AddressList,
} from '@borneo/shared';
import { getJson, send, sendJson } from '../../../shared/lib/http';

export const getAddresses = (): Promise<AddressList> => getJson('/me/addresses', addressListSchema);

export const postAddress = (input: AddressInput): Promise<Address> =>
  sendJson('POST', '/me/addresses', input, addressSchema);

export const putAddress = (id: string, input: AddressInput): Promise<Address> =>
  sendJson('PUT', `/me/addresses/${id}`, input, addressSchema);

export const deleteAddress = (id: string) => send('DELETE', `/me/addresses/${id}`);

export const postDefault = (id: string) => send('POST', `/me/addresses/${id}/default`);
