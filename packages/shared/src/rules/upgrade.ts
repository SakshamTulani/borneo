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

/** A product in the same line as seen by the PDP nudge and compare picks (D-237, D-238). */
export type LineProduct = UpgradeProduct & {
  slug: string;
  status: 'live' | 'preorder' | 'discontinued';
};

/**
 * The PDP nudge for everyone (D-237): the newest generation in the line that is sold (live or
 * pre-order), same tier if it exists, else the nearest tier; failing that, a higher tier of this
 * generation. Never a lower generation or tier, never a discontinued model (D-131, D-138).
 */
export function newerModel<T extends LineProduct>(
  current: UpgradeProduct,
  line: T[],
): { product: T; kind: 'newerGeneration' | 'higherTier' } | undefined {
  const sold = line.filter(
    (p) => p.lineId === current.lineId && p.id !== current.id && p.status !== 'discontinued',
  );
  const newer = sold
    .filter((p) => p.generation > current.generation)
    .sort(
      (a, b) =>
        b.generation - a.generation ||
        Math.abs(TIER_RANK[a.familyTier] - TIER_RANK[current.familyTier]) -
          Math.abs(TIER_RANK[b.familyTier] - TIER_RANK[current.familyTier]),
    )[0];
  if (newer) return { product: newer, kind: 'newerGeneration' };
  const stepUp = sold
    .filter(
      (p) =>
        p.generation === current.generation &&
        TIER_RANK[p.familyTier] > TIER_RANK[current.familyTier],
    )
    .sort((a, b) => TIER_RANK[a.familyTier] - TIER_RANK[b.familyTier])[0];
  return stepUp ? { product: stepUp, kind: 'higherTier' } : undefined;
}

/**
 * One-tap compares from a PDP (D-238): the previous generation (same tier if it exists, even if
 * no longer sold, so owners can see what changed), the newer model from `newerModel`, and the
 * other tiers of this generation. At most 3, in that order.
 */
export function lineCompareCandidates<T extends LineProduct>(
  current: UpgradeProduct,
  line: T[],
): { product: T; relation: 'previous' | 'newer' | 'sibling' }[] {
  const same = line.filter((p) => p.lineId === current.lineId && p.id !== current.id);
  const previous = same
    .filter((p) => p.generation === current.generation - 1)
    .sort(
      (a, b) =>
        Math.abs(TIER_RANK[a.familyTier] - TIER_RANK[current.familyTier]) -
        Math.abs(TIER_RANK[b.familyTier] - TIER_RANK[current.familyTier]),
    )[0];
  // A higher tier of this generation is a sibling, not a newer model.
  const next = newerModel(current, same);
  const newer = next?.kind === 'newerGeneration' ? next.product : undefined;
  const siblings = same
    .filter((p) => p.generation === current.generation && p.status !== 'discontinued')
    .sort((a, b) => TIER_RANK[a.familyTier] - TIER_RANK[b.familyTier]);
  const picks = [
    ...(previous ? [{ product: previous, relation: 'previous' as const }] : []),
    ...(newer ? [{ product: newer, relation: 'newer' as const }] : []),
    ...siblings.map((product) => ({ product, relation: 'sibling' as const })),
  ];
  const seen = new Set<string>();
  return picks.filter((p) => !seen.has(p.product.id) && seen.add(p.product.id)).slice(0, 3);
}
