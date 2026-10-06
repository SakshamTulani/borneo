import { isValidPincode } from '../contracts/common';
import type {
  AddressPin,
  GeoPoint,
  PincodeArea,
  DeliveryLane,
  ServiceabilityRow,
  WarehouseStock,
} from '../contracts/delivery';
import { addIstDays } from '../time';

export type DeliveryEstimate =
  | { status: 'invalidPincode' }
  | { status: 'notDeliverable' }
  | { status: 'outOfStockHere' }
  /** Estimated range, not a promise (D-52). `from`/`to` are IST dates. */
  | { status: 'deliverable'; warehouseId: string; from: string; to: string; codAllowed: boolean };

/**
 * Warehouses with a lane to the pincode, fastest first (D-63): the longest matching pincode prefix
 * is each warehouse's lane; ties go to the shorter minimum, then the warehouse id. Delivery
 * estimates and stock reservation (D-203) both walk this order.
 */
export function warehousesBySpeed(
  pincode: string,
  lanes: DeliveryLane[],
): { warehouseId: string; lane: DeliveryLane }[] {
  const laneFor = (warehouseId: string) =>
    lanes
      .filter((l) => l.warehouseId === warehouseId && pincode.startsWith(l.pincodePrefix))
      .sort((a, b) => b.pincodePrefix.length - a.pincodePrefix.length)[0];
  return [...new Set(lanes.map((l) => l.warehouseId))]
    .map((warehouseId) => ({ warehouseId, lane: laneFor(warehouseId) }))
    .filter((c): c is { warehouseId: string; lane: DeliveryLane } => c.lane !== undefined)
    .sort(
      (a, b) =>
        a.lane.maxDays - b.lane.maxDays ||
        a.lane.minDays - b.lane.minDays ||
        a.warehouseId.localeCompare(b.warehouseId),
    );
}

/**
 * Serviceability per pincode × category (D-50); a missing row means not deliverable (D-62).
 * Picks the fastest warehouse that has stock and a lane to the pincode (D-54, D-63).
 * Pre-orders start counting from the expected dispatch date (D-64).
 */
export function deliveryEstimate(input: {
  pincode: string;
  categoryId: string;
  qty: number;
  rows: ServiceabilityRow[];
  stock: WarehouseStock[];
  lanes: DeliveryLane[];
  now: number;
  /** Pre-orders: expected dispatch window (D-64). `dispatchTo` defaults to `dispatchFrom`. */
  dispatchFrom?: number;
  dispatchTo?: number;
}): DeliveryEstimate {
  const { pincode, categoryId, qty, now } = input;
  if (!isValidPincode(pincode)) return { status: 'invalidPincode' };
  const row = input.rows.find((r) => r.pincode === pincode && r.categoryId === categoryId);
  if (!row?.deliverable) return { status: 'notDeliverable' };

  const reachable = warehousesBySpeed(pincode, input.lanes);
  if (reachable.length === 0) return { status: 'notDeliverable' };

  // Pre-orders ship from future stock, so only the lane matters (D-64).
  const preorder = input.dispatchFrom !== undefined;
  const best = reachable.find(
    (c) =>
      preorder || (input.stock.find((s) => s.warehouseId === c.warehouseId)?.available ?? 0) >= qty,
  );
  if (!best) return { status: 'outOfStockHere' };

  const start = Math.max(now, input.dispatchFrom ?? now);
  const end = Math.max(start, input.dispatchTo ?? start);
  return {
    status: 'deliverable',
    warehouseId: best.warehouseId,
    from: addIstDays(start, best.lane.minDays),
    to: addIstDays(end, best.lane.maxDays),
    codAllowed: row.codAllowed,
  };
}

/** Recheck stock, date and COD when the pincode or map pin changes (D-55). */
export function addressNeedsRecheck(previous: AddressPin | undefined, next: AddressPin): boolean {
  return (
    !previous ||
    previous.pincode !== next.pincode ||
    previous.lat !== next.lat ||
    previous.lng !== next.lng
  );
}

/** A map pin resolves to a pincode only within this distance of its centre (D-184). */
export const PIN_MATCH_MAX_KM = 15;
const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The pincode for a map pin (D-52, D-184): the nearest known pincode centre within
 * `maxKm`, else none, and the customer types the pincode instead.
 */
export function nearestPincode<T extends PincodeArea>(
  pin: GeoPoint,
  areas: T[],
  maxKm = PIN_MATCH_MAX_KM,
): T | undefined {
  let best: { area: T; km: number } | undefined;
  for (const area of areas) {
    const km = distanceKm(pin, area);
    if (
      km <= maxKm &&
      (!best || km < best.km || (km === best.km && area.pincode < best.area.pincode))
    )
      best = { area, km };
  }
  return best?.area;
}

/**
 * The pincode the PDP checks first (D-185): a signed-in default address's, else the one this
 * browser last checked.
 */
export function startingPincode(
  defaultAddress: string | null,
  browser: string | null,
): string | null {
  return defaultAddress ?? browser;
}
