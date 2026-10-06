import {
  codEligibility,
  deliveryEstimate,
  flashState,
  nearestPincode,
  PIN_MATCH_MAX_KM,
  variantAvailability,
  type DeliveryCheck,
  type DeliveryLane,
  type FlashSale,
  type GeoPoint,
  type PincodeArea,
  type ServiceabilityRow,
  type WarehouseStock,
} from '@borneo/shared';
import { notFound } from '../../errors';
import type { DeliveryTarget } from './delivery.repository';

export type DeliveryDeps = {
  now: () => number;
  findTarget: (sku: string) => Promise<DeliveryTarget | undefined>;
  findArea: (pincode: string) => Promise<PincodeArea | undefined>;
  areasNear: (pin: GeoPoint, km: number) => Promise<PincodeArea[]>;
  loadServiceability: (pincode: string, categoryId: string) => Promise<ServiceabilityRow[]>;
  loadStock: (variantId: string) => Promise<WarehouseStock[]>;
  listLanes: () => Promise<DeliveryLane[]>;
  loadFlashSales: (variantId: string) => Promise<FlashSale[]>;
};

/** Start of an IST calendar date ("YYYY-MM-DD"). */
const istDayStart = (date: string) => Date.parse(`${date}T00:00:00+05:30`);

export function createDeliveryService(deps: DeliveryDeps) {
  return {
    /**
     * Estimate for one variant at one pincode (D-50–54, D-62–64), with the COD line the PDP
     * shows (D-186): pincode × category, never for pre-orders or live flash sales (D-71).
     */
    async check(sku: string, pincode: string, qty: number): Promise<DeliveryCheck> {
      const target = await deps.findTarget(sku);
      if (!target || (target.status !== 'live' && target.status !== 'preorder')) {
        throw notFound('VARIANT_NOT_FOUND', `No variant on sale with SKU ${sku}`);
      }
      const now = deps.now();
      const [area, rows, stock, lanes, sales] = await Promise.all([
        deps.findArea(pincode),
        deps.loadServiceability(pincode, target.categoryId),
        deps.loadStock(target.variantId),
        deps.listLanes(),
        deps.loadFlashSales(target.variantId),
      ]);
      const place = area ? { city: area.city, state: area.state } : null;

      const preorder = target.status === 'preorder';
      const availability = variantAvailability({
        status: target.status,
        unitsAvailable: stock.reduce((n, s) => n + s.available, 0),
        preorderCap: target.preorderCap,
        preorderSold: target.preorderSold,
      });
      const estimate = deliveryEstimate({
        pincode,
        categoryId: target.categoryId,
        qty,
        rows,
        stock,
        lanes,
        now,
        ...(preorder && target.dispatchFrom
          ? {
              dispatchFrom: istDayStart(target.dispatchFrom),
              ...(target.dispatchTo ? { dispatchTo: istDayStart(target.dispatchTo) } : {}),
            }
          : {}),
      });

      if (estimate.status !== 'deliverable') return { pincode, place, estimate };
      // Pre-orders sell against what is left of the cap, not warehouse stock (D-65).
      const capLeft = (target.preorderCap ?? 0) - target.preorderSold;
      if (availability === 'outOfStock' || (preorder && capLeft < qty)) {
        return { pincode, place, estimate: { status: 'outOfStockHere' } };
      }
      const cod = codEligibility({
        lines: [
          {
            codAllowedAtPincode: estimate.codAllowed,
            isPreorder: preorder,
            isFlash: sales.some((s) => flashState(s, now) === 'live'),
          },
        ],
        // The order-value cap (D-72) is a checkout rule; the PDP line ignores it (D-186).
        orderTotalPaise: 0,
      });
      return {
        pincode,
        place,
        estimate: {
          status: 'deliverable',
          from: estimate.from,
          to: estimate.to,
          cod: cod.allowed ? { allowed: true, reasons: [] } : cod,
        },
      };
    },

    /** The pincode for a map pin (D-184); 404 when no known pincode is close enough. */
    async pincodeAt(pin: GeoPoint): Promise<PincodeArea> {
      const area = nearestPincode(pin, await deps.areasNear(pin, PIN_MATCH_MAX_KM));
      if (!area) {
        throw notFound('PINCODE_NOT_FOUND', 'No known pincode near this pin; type the pincode');
      }
      return area;
    },

    /** A known pincode's place and centre, to fill an address and centre its map (D-189). */
    async pincodeArea(pincode: string): Promise<PincodeArea> {
      const area = await deps.findArea(pincode);
      if (!area) throw notFound('PINCODE_NOT_FOUND', `We don't know pincode ${pincode}`);
      return area;
    },
  };
}

export type DeliveryService = ReturnType<typeof createDeliveryService>;
