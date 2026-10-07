import {
  formatAttributeValue,
  upgradeBadge,
  upgradeStrip,
  whatYouGain,
  type AttributeDef,
  type CustomerId,
  type FamilyTier,
  type ProductSummary,
  type UpgradeForProduct,
  type UpgradeStripView,
} from '@borneo/shared';
import type { ListingRow, UpgradeTarget } from '../catalog/index';

type Owned = {
  id: string;
  slug: string;
  name: string;
  lineId: string;
  generation: number;
  familyTier: FamilyTier;
  attributes: Record<string, unknown>;
  categoryId: string;
  categoryDepth: 'full' | 'template';
  returnWindowEndsAt: Date | null;
};

export type UpgradeDeps = {
  now: () => number;
  listOwned: (customerId: CustomerId) => Promise<Owned[]>;
  listLineProducts: (lineIds: string[]) => Promise<
    {
      id: string;
      slug: string;
      name: string;
      lineId: string;
      generation: number;
      familyTier: FamilyTier;
    }[]
  >;
  findTarget: (slug: string) => Promise<UpgradeTarget | undefined>;
  listAttributeDefs: (categoryId: string) => Promise<AttributeDef[]>;
  listBuyable: (ids: string[]) => Promise<ListingRow[]>;
  summarize: (rows: ListingRow[]) => Promise<ProductSummary[]>;
};

const NONE: UpgradeForProduct = { badge: null, gains: [], changes: [] };

/**
 * Upgrades for signed-in owners (D-130–138): the home strip and, on a product page, the badge and
 * "what you gain" against the owned device it names (D-133, D-226). Owned = delivered, kept (D-24).
 */
export function createUpgradeService(deps: UpgradeDeps) {
  const ownedItems = (rows: Owned[]) =>
    rows.map((o) => ({
      ...o,
      // No window recorded (older orders) = already closed.
      returnWindowEndsAt: o.returnWindowEndsAt?.getTime() ?? 0,
    }));

  return {
    async strip(customerId: CustomerId): Promise<UpgradeStripView> {
      const owned = ownedItems(await deps.listOwned(customerId));
      if (owned.length === 0) return { items: [] };
      const catalog = await deps.listLineProducts([...new Set(owned.map((o) => o.lineId))]);
      const picks = upgradeStrip(owned, catalog, deps.now());
      const cards = new Map(
        (await deps.summarize(await deps.listBuyable(picks.map((p) => p.to.id)))).map((c) => [
          c.id,
          c,
        ]),
      );
      return {
        items: picks.flatMap((p) => {
          const to = cards.get(p.to.id);
          const from = owned.find((o) => o.id === p.from.id)!;
          return to ? [{ from: { name: from.name, slug: from.slug }, to }] : [];
        }),
      };
    },

    async forProduct(customerId: CustomerId, slug: string): Promise<UpgradeForProduct> {
      const [product, ownedRows] = await Promise.all([
        deps.findTarget(slug),
        deps.listOwned(customerId),
      ]);
      if (!product || ownedRows.length === 0) return NONE;
      const owned = ownedItems(ownedRows);
      const badge = upgradeBadge(owned, product, deps.now());
      if (!badge) return NONE;
      const base = owned.find((o) => o.name === badge.fromName && o.lineId === product.lineId)!;
      // "What you gain" is for phones and audio, the full-depth categories (D-133).
      if (base.categoryDepth !== 'full' || base.categoryId !== product.categoryId)
        return { badge: { fromName: base.name, fromSlug: base.slug }, gains: [], changes: [] };
      const defs = await deps.listAttributeDefs(product.categoryId);
      return {
        badge: { fromName: base.name, fromSlug: base.slug },
        ...whatYouGain(
          defs,
          product.compare ?? [],
          base.attributes,
          product.attributes,
          formatAttributeValue,
        ),
      };
    },
  };
}

export type UpgradeService = ReturnType<typeof createUpgradeService>;
