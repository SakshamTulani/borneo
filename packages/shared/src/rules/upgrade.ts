import type { AttributeDef, Attributes, FamilyTier } from '../contracts/catalog';

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

/**
 * "What you gain" against the customer's owned device (D-133, D-226), from the category's compare
 * attributes. A gain is a higher number (a lower one for weight in grams), a feature it gains, an
 * enum option later in the configured order (options are listed weakest first), or list items it
 * adds. Other differences are listed as changes, with no claim of better or worse (D-22).
 */
export function whatYouGain(
  defs: AttributeDef[],
  keys: string[],
  owned: Attributes,
  candidate: Attributes,
  format: (def: AttributeDef, value: unknown) => string | undefined,
): {
  gains: { label: string; from: string | null; to: string }[];
  changes: { label: string; from: string | null; to: string | null }[];
} {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const gains: { label: string; from: string | null; to: string }[] = [];
  const changes: { label: string; from: string | null; to: string | null }[] = [];
  for (const key of keys) {
    const def = byKey.get(key);
    if (!def) continue;
    const a = owned[key];
    const b = candidate[key];
    const from = format(def, a) ?? null;
    const to = format(def, b) ?? null;
    if (from === to || to === null) continue;
    let gain = false;
    if (def.type === 'number' && typeof a === 'number' && typeof b === 'number')
      gain = def.unit === 'g' ? b < a : b > a;
    else if (def.type === 'bool') gain = b === true && a !== true;
    else if (def.type === 'enum' && def.options && typeof b === 'string')
      gain = def.options.indexOf(b) > (typeof a === 'string' ? def.options.indexOf(a) : -1);
    else if (def.type === 'list' && Array.isArray(b))
      gain = b.some((v) => !(Array.isArray(a) && a.includes(v)));
    if (gain) gains.push({ label: def.label, from, to });
    else changes.push({ label: def.label, from, to });
  }
  return { gains, changes };
}
