import type { FamilyTier } from '../contracts/catalog';

const TIER_RANK: Record<FamilyTier, number> = { standard: 0, pro: 1, premium: 2 };

export type UpgradeProduct = {
  id: string;
  name: string;
  lineId: string;
  generation: number;
  familyTier: FamilyTier;
};
/** A delivered order item (D-24). */
export type OwnedItem = UpgradeProduct & { returnWindowEndsAt: number };

/** Same line, generation and tier not lower, at least one higher (D-131, D-138). */
export function isUpgrade(from: UpgradeProduct, to: UpgradeProduct): boolean {
  if (from.lineId !== to.lineId || from.id === to.id) return false;
  const gen = to.generation - from.generation;
  const tier = TIER_RANK[to.familyTier] - TIER_RANK[from.familyTier];
  return gen >= 0 && tier >= 0 && gen + tier > 0;
}

/** Compares against the newest, highest owned item in the line (D-137). */
function bestOwnedInLine(owned: OwnedItem[], lineId: string): OwnedItem | undefined {
  return owned
    .filter((o) => o.lineId === lineId)
    .sort(
      (a, b) => b.generation - a.generation || TIER_RANK[b.familyTier] - TIER_RANK[a.familyTier],
    )[0];
}

/**
 * "Upgrade from your X" on a product (D-130–132): only for logged-in customers who own an
 * older/lower model in the same line; hidden if they already own this or anything at least
 * as new and high; hidden while the owned item is inside its return window.
 */
export function upgradeBadge(
  owned: OwnedItem[],
  candidate: UpgradeProduct,
  now: number,
): { fromName: string } | undefined {
  const base = bestOwnedInLine(owned, candidate.lineId);
  if (!base || !isUpgrade(base, candidate)) return undefined;
  if (now <= base.returnWindowEndsAt) return undefined;
  return { fromName: base.name };
}

/**
 * Home "Upgrade available" strip (D-121, D-132): per owned line, only when a newer generation
 * exists. Picks the natural successor: the newest generation that is an upgrade, same tier if it
 * exists, otherwise the nearest higher tier (D-136).
 */
export function upgradeStrip(
  owned: OwnedItem[],
  catalog: UpgradeProduct[],
  now: number,
): { from: OwnedItem; to: UpgradeProduct }[] {
  return [...new Set(owned.map((o) => o.lineId))].flatMap((lineId) => {
    const base = bestOwnedInLine(owned, lineId)!;
    if (now <= base.returnWindowEndsAt) return [];
    const to = catalog
      .filter((p) => p.generation > base.generation && isUpgrade(base, p))
      .sort(
        (a, b) => b.generation - a.generation || TIER_RANK[a.familyTier] - TIER_RANK[b.familyTier],
      )[0];
    return to ? [{ from: base, to }] : [];
  });
}
