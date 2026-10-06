import type {
  AttributeDef,
  Attributes,
  Availability,
  CategoryConfig,
  FilterFacet,
  ListingFilter,
  ProductStatus,
  SpecGroup,
} from '../contracts/catalog';

const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/**
 * One attribute value as a customer reads it: options by their label, booleans as Yes/No,
 * numbers with their unit. Missing or malformed values give `undefined`, never a guess (D-16, D-22).
 */
export function formatAttributeValue(def: AttributeDef, value: unknown): string | undefined {
  const label = (option: string) => def.optionLabels?.[option] ?? option;
  switch (def.type) {
    case 'bool':
      return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : undefined;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? `${number.format(value)}${def.unit ? ` ${def.unit}` : ''}`
        : undefined;
    case 'enum':
      return typeof value === 'string' && value.length > 0 ? label(value) : undefined;
    case 'list':
      return Array.isArray(value) && value.length > 0
        ? value.map((v) => label(String(v))).join(', ')
        : undefined;
    case 'text':
      return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }
}

/** Spec groups from category config (D-14). Unfilled rows stay and read "Not specified" (D-22). */
export function specGroups(
  config: CategoryConfig,
  defs: AttributeDef[],
  attributes: Attributes,
): SpecGroup[] {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  return config.specGroups.map((g) => ({
    title: g.label,
    rows: g.keys.flatMap((key) => {
      const def = byKey.get(key);
      if (!def) return [];
      const value = formatAttributeValue(def, attributes[key]);
      return [value === undefined ? { label: def.label } : { label: def.label, value }];
    }),
  }));
}

/**
 * Pre-orders sell against the variant's pre-order cap (D-65); live products against unreserved
 * warehouse stock. Discontinued and draft products are not sold (D-17).
 */
export function variantAvailability(input: {
  status: ProductStatus;
  unitsAvailable: number;
  preorderCap: number | null;
  preorderSold: number;
}): Availability {
  if (input.status === 'preorder') {
    return input.preorderCap !== null && input.preorderSold < input.preorderCap
      ? 'preorder'
      : 'outOfStock';
  }
  if (input.status === 'live') return input.unitsAvailable > 0 ? 'inStock' : 'outOfStock';
  return 'outOfStock';
}

/** A product is in stock if any variant is; else on pre-order if any variant is (D-65). */
export function productAvailability(variants: Availability[]): Availability {
  if (variants.includes('inStock')) return 'inStock';
  if (variants.includes('preorder')) return 'preorder';
  return 'outOfStock';
}

/**
 * The variant a product card prices (D-19): the lowest price payable now among variants that can
 * be bought (flash price while live), falling back to the lowest price overall.
 */
export function cardVariant<T extends { availability: Availability; sellingPaise: number }>(
  variants: T[],
): T | undefined {
  const cheapest = (list: T[]) =>
    list.reduce<T | undefined>(
      (a, v) => (!a || v.sellingPaise < a.sellingPaise ? v : a),
      undefined,
    );
  return cheapest(variants.filter((v) => v.availability !== 'outOfStock')) ?? cheapest(variants);
}

export type FilterParseError = { code: 'UNKNOWN_FILTER' | 'INVALID_FILTER'; key: string };

/**
 * Category filters from query params named by attribute key (D-18). Only keys in the category's
 * filter config are accepted. Options: comma-separated, any of them matches. Yes/no: only "true".
 * Numbers: a minimum ("8 GB or more").
 */
export function parseListingFilters(
  raw: Record<string, string>,
  config: CategoryConfig,
  defs: AttributeDef[],
): { ok: true; filters: ListingFilter[] } | { ok: false; error: FilterParseError } {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const filters: ListingFilter[] = [];
  for (const [key, value] of Object.entries(raw)) {
    const def = byKey.get(key);
    if (!def || !config.filters.includes(key)) {
      return { ok: false, error: { code: 'UNKNOWN_FILTER', key } };
    }
    const invalid = { ok: false as const, error: { code: 'INVALID_FILTER' as const, key } };
    switch (def.type) {
      case 'enum':
      case 'list': {
        const values = [...new Set(value.split(',').filter((v) => v.length > 0))];
        if (values.length === 0 || values.some((v) => !def.options?.includes(v))) return invalid;
        filters.push({ key, kind: 'anyOf', values });
        break;
      }
      case 'bool':
        if (value !== 'true') return invalid;
        filters.push({ key, kind: 'isTrue' });
        break;
      case 'number': {
        const n = Number(value);
        if (value.trim() === '' || !Number.isFinite(n)) return invalid;
        filters.push({ key, kind: 'atLeast', value: n });
        break;
      }
      case 'text':
        return invalid;
    }
  }
  return { ok: true, filters };
}

const PRICE_CAP_RUPEES = [
  5_000, 10_000, 15_000, 20_000, 30_000, 50_000, 75_000, 1_00_000, 1_50_000,
];

/**
 * "Up to ₹X" choices for the price filter (D-18), in paise: only caps that narrow the category,
 * at or above its cheapest listed price and below its dearest.
 */
export function priceCaps(range: { min: number; max: number } | null): number[] {
  if (!range) return [];
  return PRICE_CAP_RUPEES.map((r) => r * 100).filter((p) => p >= range.min && p < range.max);
}

/**
 * Filter choices for a category page, in config order, from the listed products' own values
 * (D-18): options and minimums nobody has are not offered; a yes/no filter shows only if some
 * product has "Yes".
 */
export function filterFacets(
  config: CategoryConfig,
  defs: AttributeDef[],
  products: Attributes[],
): FilterFacet[] {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  return config.filters.flatMap((key): FilterFacet[] => {
    const def = byKey.get(key);
    if (!def) return [];
    const values = products.map((p) => p[key]);
    switch (def.type) {
      case 'enum':
      case 'list': {
        const present = new Set(values.flat().filter((v): v is string => typeof v === 'string'));
        const options = (def.options ?? [])
          .filter((o) => present.has(o))
          .map((o) => ({ value: o, label: def.optionLabels?.[o] ?? o }));
        return options.length ? [{ key, label: def.label, kind: 'anyOf', options }] : [];
      }
      case 'bool':
        return values.includes(true) ? [{ key, label: def.label, kind: 'isTrue' }] : [];
      case 'number': {
        const nums = [
          ...new Set(
            values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)),
          ),
        ].sort((a, b) => a - b);
        return nums.length > 1
          ? [
              {
                key,
                label: def.label,
                kind: 'atLeast',
                ...(def.unit ? { unit: def.unit } : {}),
                values: nums.slice(1),
              },
            ]
          : [];
      }
      case 'text':
        return [];
    }
  });
}
