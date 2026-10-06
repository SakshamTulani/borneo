import type { Address, AddressInput } from '@borneo/shared';

/** An address as the book lists it. */
export type AddressCard = {
  id: string;
  name: string;
  /** "98765 43210" */
  phone: string;
  /** Street lines, then "City, State 560034". */
  lines: string[];
  isDefault: boolean;
};

/** Form state: the pin is unset until placed (D-53). */
export type AddressFormValues = Omit<AddressInput, 'lat' | 'lng'> & {
  lat: number | undefined;
  lng: number | undefined;
};

export type { Address };
