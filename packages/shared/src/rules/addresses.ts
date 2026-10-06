import type { GeoPoint } from '../contracts/delivery';
import { distanceKm } from './serviceability';

/** Address book size (D-188). */
export const MAX_ADDRESSES = 20;

/** A pin farther than this from its pincode's centre is probably a mistake (D-189). */
export const PIN_MAX_KM_FROM_PINCODE = 50;

/** India's mainland and islands, generously (D-189). */
const INDIA = { south: 6, north: 37.5, west: 68, east: 97.5 };

export function isPinInIndia(pin: GeoPoint): boolean {
  return (
    pin.lat >= INDIA.south &&
    pin.lat <= INDIA.north &&
    pin.lng >= INDIA.west &&
    pin.lng <= INDIA.east
  );
}

/**
 * The pin sits within reach of its pincode (D-189). An unknown pincode has no centre to compare
 * with, so any pin in India is accepted.
 */
export function pinMatchesPincode(pin: GeoPoint, pincodeCentre: GeoPoint | null): boolean {
  if (!isPinInIndia(pin)) return false;
  return pincodeCentre === null || distanceKm(pin, pincodeCentre) <= PIN_MAX_KM_FROM_PINCODE;
}

export function canAddAddress(existing: number): boolean {
  return existing < MAX_ADDRESSES;
}

/** The first address is the default; later ones only when the customer asks (D-188). */
export function isDefaultOnAdd(existing: number, requested: boolean): boolean {
  return existing === 0 || requested;
}

/** Deleting the default makes the newest remaining address the default (D-188). */
export function defaultAfterDelete(
  remaining: readonly { id: string; createdAt: Date }[],
): string | null {
  let newest: { id: string; createdAt: Date } | null = null;
  for (const a of remaining) {
    if (!newest || a.createdAt.getTime() > newest.createdAt.getTime()) newest = a;
  }
  return newest?.id ?? null;
}
