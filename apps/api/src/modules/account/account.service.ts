import {
  canCustomerCancel,
  ownedProducts,
  pickSuggestions,
  reviewPrompts,
  type AccountSummary,
  type CustomerId,
  type OrderStatus,
  type OwnedDevice,
  type ProductImage,
  type ProductSummary,
  type RelationEdge,
} from '@borneo/shared';
import type { ListingRow } from '../catalog/index';
import type { DeliveredLineRow } from '../orders/index';

export type AccountDeps = {
  listDelivered: (customerId: CustomerId) => Promise<DeliveredLineRow[]>;
  countOrders: (customerId: CustomerId) => Promise<Map<OrderStatus, number>>;
  reviewedProductIds: (customerId: CustomerId) => Promise<Set<string>>;
  countWatch: (customerId: CustomerId) => Promise<number>;
  countOpenReturns: (customerId: CustomerId) => Promise<number>;
  memberSince: (customerId: CustomerId) => Promise<Date | undefined>;
  loadEdges: (productIds: string[]) => Promise<RelationEdge[]>;
  listBuyable: (productIds: string[]) => Promise<ListingRow[]>;
  summarize: (rows: ListingRow[]) => Promise<ProductSummary[]>;
  loadImages: (productIds: string[]) => Promise<Map<string, ProductImage[]>>;
};

const delivered = (lines: DeliveredLineRow[]) =>
  lines.map((l) => ({ ...l, deliveredAt: l.deliveredAt!.getTime() }));

/** The account overview and owned devices (D-24, D-220, D-223). */
export function createAccountService(deps: AccountDeps) {
  return {
    async summary(customerId: CustomerId): Promise<AccountSummary> {
      const [lines, orders, reviewed, watching, openReturns, since] = await Promise.all([
        deps.listDelivered(customerId),
        deps.countOrders(customerId),
        deps.reviewedProductIds(customerId),
        deps.countWatch(customerId),
        deps.countOpenReturns(customerId),
        deps.memberSince(customerId),
      ]);
      const all = [...orders.values()].reduce((a, b) => a + b, 0);
      const active = [...orders.entries()]
        .filter(([status]) => canCustomerCancel(status) || status === 'shipped')
        .reduce((a, [, n]) => a + n, 0);
      return {
        orders: all,
        activeOrders: active,
        devices: ownedProducts(delivered(lines)).length,
        reviewPrompts: reviewPrompts(delivered(lines), reviewed).length,
        watching,
        openReturns,
        memberSince: since?.getTime() ?? 0,
      };
    },

    /** What the customer owns, each with up to 4 add-ons and their reason (D-220, D-124). */
    async devices(customerId: CustomerId): Promise<{ items: OwnedDevice[] }> {
      const owned = ownedProducts(delivered(await deps.listDelivered(customerId)));
      const ownedIds = new Set(owned.map((o) => o.productId));
      const edges = await deps.loadEdges([...ownedIds]);
      const buyable = new Map(
        (await deps.listBuyable([...new Set(edges.map((e) => e.toProductId))])).map((r) => [
          r.id,
          r,
        ]),
      );
      const picks = new Map(
        owned.map((o) => [
          o.productId,
          pickSuggestions({
            edges: edges.filter(
              (e) => e.fromProductId === o.productId && buyable.has(e.toProductId),
            ),
            surface: 'ownedDevice',
            exclude: ownedIds,
          }),
        ]),
      );
      const wanted = [...new Set([...picks.values()].flat().map((p) => p.productId))];
      const [cards, images] = await Promise.all([
        deps.summarize(wanted.map((id) => buyable.get(id)!)),
        deps.loadImages([...ownedIds]),
      ]);
      const byId = new Map(cards.map((c) => [c.id, c]));
      return {
        items: owned.map((o) => ({
          productId: o.productId,
          slug: o.slug,
          name: o.productName,
          category: o.categoryName,
          options: o.options,
          image: images.get(o.productId)?.[0] ?? null,
          orderId: o.orderId,
          orderNumber: o.orderNumber,
          deliveredAt: o.deliveredAt,
          returnWindowEndsAt: o.returnWindowEndsAt?.getTime() ?? null,
          accessories: (picks.get(o.productId) ?? []).flatMap((p) => {
            const card = byId.get(p.productId);
            return card
              ? [
                  {
                    slug: card.slug,
                    name: card.name,
                    pricePaise: card.price.sellingPaise,
                    image: card.image,
                    reason: p.reason,
                  },
                ]
              : [];
          }),
        })),
      };
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
