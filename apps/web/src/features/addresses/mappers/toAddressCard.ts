import type { Address } from '@borneo/shared';
import type { AddressCard, AddressFormValues } from '../model';

const spacedMobile = (phone: string) => `${phone.slice(0, 5)} ${phone.slice(5)}`;

export function toAddressCard(a: Address): AddressCard {
  return {
    id: a.id,
    name: a.name,
    phone: spacedMobile(a.phone),
    lines: [
      a.line1,
      ...(a.line2 ? [a.line2] : []),
      ...(a.landmark ? [`Near ${a.landmark.replace(/^near\s+/i, '')}`] : []),
      `${a.city}, ${a.state} ${a.pincode}`,
    ],
    isDefault: a.isDefault,
  };
}

/** Starting values: an existing address to edit, or a blank one with the customer's name and phone. */
export function toFormValues(
  address: Address | undefined,
  customer: { name: string; phone: string | null } | null,
): AddressFormValues {
  if (address) {
    return {
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? '',
      landmark: address.landmark ?? '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      lat: address.lat,
      lng: address.lng,
      isDefault: address.isDefault,
    };
  }
  return {
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    line1: '',
    line2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    lat: undefined,
    lng: undefined,
    isDefault: false,
  };
}
