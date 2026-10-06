import type {
  ProductRef,
  RelationEdge,
  RelationOverride,
  RelationRule,
} from '../contracts/catalog';
import { isFilled } from './compatibility';

function matches(rule: RelationRule, from: ProductRef, to: ProductRef): boolean {
  const a = from.attributes[rule.match.fromAttr];
  const b = to.attributes[rule.match.toAttr];
  if (!isFilled(a) || !isFilled(b)) return false; // missing attribute = no relation (D-22)
  if (rule.match.kind === 'equal') return a === b;
  if (Array.isArray(a)) return a.includes(b);
  if (Array.isArray(b)) return b.includes(a);
  return false;
}

const reasonFor = (template: string, from: ProductRef, to: ProductRef) =>
  template.replaceAll('{from}', from.name).replaceAll('{to}', to.name);

const keyOf = (e: { fromProductId: string; toProductId: string; type: string }) =>
  `${e.fromProductId}>${e.toProductId}>${e.type}`;

/** Same-line edges: previous/next generation and family tiers (D-20). */
export function lineEdges(products: ProductRef[]): RelationEdge[] {
  const edges: RelationEdge[] = [];
  for (const a of products) {
    for (const b of products) {
      if (a.id === b.id || a.lineId !== b.lineId) continue;
      if (b.generation === a.generation - 1)
        edges.push({
          fromProductId: a.id,
          toProductId: b.id,
          type: 'prev_gen',
          source: 'line',
          reason: `Previous generation of ${a.name}`,
        });
      if (b.generation === a.generation + 1)
        edges.push({
          fromProductId: a.id,
          toProductId: b.id,
          type: 'next_gen',
          source: 'line',
          reason: `Newer generation of ${a.name}`,
        });
      if (b.generation === a.generation && b.familyTier !== a.familyTier)
        edges.push({
          fromProductId: a.id,
          toProductId: b.id,
          type: 'family_tier',
          source: 'line',
          reason: `Also in the ${a.name} family`,
        });
    }
  }
  return edges;
}

/**
 * Materialised relations (D-21): rule edges ∪ line edges ∪ manual adds − manual removes.
 * A remove beats an add for the same edge; such pairs are reported as conflicts (D-27).
 */
export function materializeRelations(input: {
  products: ProductRef[];
  rules: RelationRule[];
  overrides: RelationOverride[];
}): { edges: RelationEdge[]; conflicts: RelationOverride[] } {
  const byId = new Map(input.products.map((p) => [p.id, p]));
  const edges = new Map<string, RelationEdge>();

  for (const rule of input.rules) {
    for (const from of input.products) {
      if (from.categoryId !== rule.fromCategoryId) continue;
      for (const to of input.products) {
        if (to.id === from.id || to.categoryId !== rule.toCategoryId || !matches(rule, from, to))
          continue;
        const edge: RelationEdge = {
          fromProductId: from.id,
          toProductId: to.id,
          type: rule.type,
          source: 'rule',
          reason: reasonFor(rule.reasonTemplate, from, to),
        };
        edges.set(keyOf(edge), edges.get(keyOf(edge)) ?? edge);
      }
    }
  }
  for (const e of lineEdges(input.products)) edges.set(keyOf(e), edges.get(keyOf(e)) ?? e);

  const removes = new Set(input.overrides.filter((o) => o.action === 'remove').map(keyOf));
  const conflicts = input.overrides.filter((o) => o.action === 'add' && removes.has(keyOf(o)));
  for (const o of input.overrides) {
    if (o.action !== 'add' || removes.has(keyOf(o))) continue;
    const from = byId.get(o.fromProductId);
    const to = byId.get(o.toProductId);
    if (!from || !to) continue;
    edges.set(keyOf(o), {
      fromProductId: from.id,
      toProductId: to.id,
      type: o.type,
      source: 'manual',
      reason: o.reason ?? `Goes with ${from.name}`,
    });
  }
  for (const key of removes) edges.delete(key);

  return { edges: [...edges.values()], conflicts };
}
