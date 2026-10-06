import { isValidPincode } from '../contracts/common';
import type {
  AddressPin,
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
  dispatchFrom?: number;
}): DeliveryEstimate {
  const { pincode, categoryId, qty, now } = input;
  if (!isValidPincode(pincode)) return { status: 'invalidPincode' };
  const row = input.rows.find((r) => r.pincode === pincode && r.categoryId === categoryId);
  if (!row?.deliverable) return { status: 'notDeliverable' };

  const laneFor = (warehouseId: string) =>
    input.lanes
      .filter((l) => l.warehouseId === warehouseId && pincode.startsWith(l.pincodePrefix))
      .sort((a, b) => b.pincodePrefix.length - a.pincodePrefix.length)[0];

  const reachable = [...new Set(input.lanes.map((l) => l.warehouseId))]
    .map((warehouseId) => ({ warehouseId, lane: laneFor(warehouseId) }))
    .filter((c): c is { warehouseId: string; lane: DeliveryLane } => c.lane !== undefined);
  if (reachable.length === 0) return { status: 'notDeliverable' };

  // Pre-orders ship from future stock, so only the lane matters (D-64).
  const preorder = input.dispatchFrom !== undefined;
  const best = reachable
    .filter(
      (c) =>
        preorder ||
        (input.stock.find((s) => s.warehouseId === c.warehouseId)?.available ?? 0) >= qty,
    )
    .sort(
      (a, b) =>
        a.lane.maxDays - b.lane.maxDays ||
        a.lane.minDays - b.lane.minDays ||
        a.warehouseId.localeCompare(b.warehouseId),
    )[0];
  if (!best) return { status: 'outOfStockHere' };

  const start = Math.max(now, input.dispatchFrom ?? now);
  return {
    status: 'deliverable',
    warehouseId: best.warehouseId,
    from: addIstDays(start, best.lane.minDays),
    to: addIstDays(start, best.lane.maxDays),
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
