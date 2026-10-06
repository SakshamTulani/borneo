import { and, between, eq, sql } from 'drizzle-orm';
import type {
  DeliveryLane,
  FlashSale,
  GeoPoint,
  PincodeArea,
  ProductStatus,
  ServiceabilityRow,
  WarehouseStock,
} from '@borneo/shared';
import type { Db } from '../../db/client';
import {
  deliveryLane,
  flashSale,
  inventory,
  pincodeArea,
  product,
  serviceability,
  variant,
} from '../../db/schema/index';

/** What the estimate needs to know about the variant being bought. */
export type DeliveryTarget = {
  variantId: string;
  categoryId: string;
  status: ProductStatus;
  /** Pre-orders: expected dispatch window, IST dates (D-64). */
  dispatchFrom: string | null;
  dispatchTo: string | null;
  preorderCap: number | null;
  preorderSold: number;
};

export async function findDeliveryTarget(db: Db, sku: string): Promise<DeliveryTarget | undefined> {
  const [row] = await db
    .select({
      variantId: variant.id,
      categoryId: product.categoryId,
      status: product.status,
      dispatchFrom: product.dispatchFrom,
      dispatchTo: product.dispatchTo,
      preorderCap: variant.preorderCap,
      preorderSold: variant.preorderSold,
    })
    .from(variant)
    .innerJoin(product, eq(product.id, variant.productId))
    .where(eq(variant.sku, sku))
    .limit(1);
  return row;
}

export async function findPincodeArea(db: Db, pincode: string): Promise<PincodeArea | undefined> {
  const [row] = await db.select().from(pincodeArea).where(eq(pincodeArea.pincode, pincode));
  return row;
}

/** Pincode centres inside a box around the pin that covers `km` in every direction (D-184). */
export async function pincodeAreasNear(db: Db, pin: GeoPoint, km: number): Promise<PincodeArea[]> {
  const dLat = km / 110.574;
  const dLng = km / (111.32 * Math.max(Math.cos((pin.lat * Math.PI) / 180), 0.01));
  return db
    .select()
    .from(pincodeArea)
    .where(
      and(
        between(pincodeArea.lat, pin.lat - dLat, pin.lat + dLat),
        between(pincodeArea.lng, pin.lng - dLng, pin.lng + dLng),
      ),
    );
}

export async function loadServiceability(
  db: Db,
  pincode: string,
  categoryId: string,
): Promise<ServiceabilityRow[]> {
  return db
    .select({
      pincode: serviceability.pincode,
      categoryId: serviceability.categoryId,
      deliverable: serviceability.deliverable,
      codAllowed: serviceability.codAllowed,
    })
    .from(serviceability)
    .where(and(eq(serviceability.pincode, pincode), eq(serviceability.categoryId, categoryId)));
}

/** Unreserved units per warehouse (D-54). */
export async function loadWarehouseStock(db: Db, variantId: string): Promise<WarehouseStock[]> {
  return db
    .select({
      warehouseId: inventory.warehouseId,
      available: sql<number>`(${inventory.onHand} - ${inventory.reserved})::int`,
    })
    .from(inventory)
    .where(eq(inventory.variantId, variantId));
}

export async function listDeliveryLanes(db: Db): Promise<DeliveryLane[]> {
  return db
    .select({
      warehouseId: deliveryLane.warehouseId,
      pincodePrefix: deliveryLane.pincodePrefix,
      minDays: deliveryLane.minDays,
      maxDays: deliveryLane.maxDays,
    })
    .from(deliveryLane);
}

export async function loadFlashSales(db: Db, variantId: string): Promise<FlashSale[]> {
  const rows = await db.select().from(flashSale).where(eq(flashSale.variantId, variantId));
  return rows.map((s) => ({
    id: s.id,
    variantId: s.variantId,
    salePricePaise: s.salePricePaise,
    startsAt: s.startsAt.getTime(),
    endsAt: s.endsAt.getTime(),
    cap: s.cap,
    sold: s.sold,
    perCustomerLimit: 1 as const,
  }));
}
