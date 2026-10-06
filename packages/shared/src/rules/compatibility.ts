import type { AttributeDef, Attributes } from '../contracts/catalog';
import { formatAttributeValue } from './catalog';

export type CompatibilityFact = { key: string; text: string };

/** Filled = present and meaningful. false / "" / [] / null are not filled (D-22). */
export function isFilled(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Compatibility facts come only from filled structured attributes marked `compat` (D-22).
 * Booleans count only when exactly true and read "Works with X"; free text never counts.
 * Other values are stated plainly, never as comparisons (D-23).
 */
export function compatibilityFacts(
  attributes: Attributes,
  defs: AttributeDef[],
): CompatibilityFact[] {
  return defs
    .filter(
      (d) =>
        d.compat &&
        d.type !== 'text' &&
        (d.type === 'bool' ? attributes[d.key] === true : isFilled(attributes[d.key])),
    )
    .flatMap((d) => {
      if (d.type === 'bool') return [{ key: d.key, text: `Works with ${d.label}` }];
      const shown = formatAttributeValue(d, attributes[d.key]);
      return shown === undefined ? [] : [{ key: d.key, text: `${d.label}: ${shown}` }];
    });
}
