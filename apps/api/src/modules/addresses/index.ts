export { addressesRoutes } from './addresses.route';
export { createAddressesService, type AddressesService } from './addresses.service';
export {
  deleteAddress,
  findAddress,
  insertAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from './addresses.repository';
export type { AddressRow } from './addresses.repository';
