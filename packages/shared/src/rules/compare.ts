import type { AttributeDef, Attributes } from '../contracts/catalog';
import { formatAttributeValue } from './catalog';

/** Compare within one category: up to 4 on desktop, 3 on mobile with 2 in view (D-122). */
export const COMPARE_MAX = 4;
export const COMPARE_MAX_MOBILE = 3;

/**
 * Adds or removes a product from the compare selection (D-122). Adding past the limit is refused,
 * never by dropping one the customer chose.
 */
export function toggleCompare(
  selection: string[],
  slug: string,
): { selection: string[]; refused: boolean } {
  if (selection.includes(slug))
    return { selection: selection.filter((s) => s !== slug), refused: false };
  if (selection.length >= COMPARE_MAX) return { selection, refused: true };
  return { selection: [...selection, slug], refused: false };
}

/**
 * Compare rows from the category's compare config (D-14, D-122): one row per attribute, each
 * product's formatted value (null = not stated, never guessed, D-22), and whether they differ.
 */
export function compareRows(
  defs: AttributeDef[],
  keys: string[],
  products: { attributes: Attributes }[],
): { key: string; label: string; values: (string | null)[]; differs: boolean }[] {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  return keys.flatMap((key) => {
    const def = byKey.get(key);
    if (!def) return [];
    const values = products.map((p) => formatAttributeValue(def, p.attributes[key]) ?? null);
    return [{ key, label: def.label, values, differs: new Set(values).size > 1 }];
  });
}
