import {
  formatInr,
  fromRupees,
  productSortSchema,
  type CategoryDetail,
  type FilterFacet,
} from '@borneo/shared';
import type { ActiveFilter, FilterControl, ListingSearch } from '../model';

const KEY = /^[a-z][a-z0-9_]*$/;
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/**
 * URL search → listing state (route `validateSearch`). Anything malformed is dropped, never an
 * error: a bad link still shows the category. Values keep the types the router parsed (8, true).
 */
export function parseListingSearch(raw: Record<string, unknown>): ListingSearch {
  const out: ListingSearch = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'sort') {
      const sort = productSortSchema.safeParse(value);
      if (sort.success && sort.data !== 'newest') out.sort = sort.data;
    } else if (key === 'maxPrice') {
      if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
        out.maxPrice = value;
    } else if (KEY.test(key) && ['string', 'number', 'boolean'].includes(typeof value)) {
      out[key] = value as string | number | boolean;
    }
  }
  return out;
}

// The router parses "128" or "true" into a number or boolean; option values are always text.
const optionValues = (v: unknown) =>
  v === undefined || v === null ? [] : String(v).split(',').filter(Boolean);

type Facets = Pick<CategoryDetail, 'filters' | 'priceCapsPaise'>;

/** The URL's price cap if the category offers it (D-18); anything else is ignored. */
const validMaxPrice = (search: ListingSearch, caps: number[]) =>
  search.maxPrice !== undefined && caps.includes(fromRupees(search.maxPrice))
    ? search.maxPrice
    : undefined;

/** Only filters the category offers, with values it offers (D-18). */
function validFilters(search: ListingSearch, facets: FilterFacet[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of facets) {
    const v = search[f.key];
    if (v === undefined) continue;
    if (f.kind === 'isTrue' && v === true) out[f.key] = 'true';
    if (f.kind === 'atLeast' && typeof v === 'number' && Number.isFinite(v)) out[f.key] = String(v);
    if (f.kind === 'anyOf') {
      const values = optionValues(v).filter((o) => f.options.some((opt) => opt.value === o));
      if (values.length) out[f.key] = values.join(',');
    }
  }
  return out;
}

/** API query params for one category page (cursor and limit are added by the repository). */
export function toListingParams(
  categorySlug: string,
  search: ListingSearch,
  facets: Facets,
): Record<string, string> {
  const maxPrice = validMaxPrice(search, facets.priceCapsPaise);
  return {
    category: categorySlug,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(maxPrice ? { maxPricePaise: String(fromRupees(maxPrice)) } : {}),
    ...validFilters(search, facets.filters),
  };
}

const atLeastLabel = (value: number, unit?: string) =>
  `${number.format(value)}${unit ? ` ${unit}` : ''} or more`;

export function toFilterControls(facets: FilterFacet[], search: ListingSearch): FilterControl[] {
  return facets.map((f): FilterControl => {
    const v = search[f.key];
    switch (f.kind) {
      case 'anyOf': {
        const selected = optionValues(v);
        return {
          kind: 'anyOf',
          key: f.key,
          label: f.label,
          options: f.options.map((o) => ({ ...o, checked: selected.includes(o.value) })),
        };
      }
      case 'isTrue':
        return { kind: 'isTrue', key: f.key, label: f.label, checked: v === true };
      case 'atLeast':
        return {
          kind: 'atLeast',
          key: f.key,
          label: f.label,
          value: typeof v === 'number' ? String(v) : '',
          options: f.values.map((n) => ({ value: String(n), label: atLeastLabel(n, f.unit) })),
        };
    }
  });
}

/** The search after toggling one option of an any-of filter. */
export function toggleOption(search: ListingSearch, key: string, option: string): ListingSearch {
  const current = optionValues(search[key]);
  const next = current.includes(option)
    ? current.filter((o) => o !== option)
    : [...current, option];
  return { ...search, [key]: next.length ? next.join(',') : undefined };
}

/** "Up to ₹X" choices, from the category's price caps (D-18). */
export function priceOptions(capsPaise: number[]): { value: string; label: string }[] {
  return capsPaise.map((p) => ({ value: String(p / 100), label: `Up to ${formatInr(p)}` }));
}

/** Chips for every applied filter, each with the search that removes it. */
export function toActiveFilters(facets: Facets, search: ListingSearch): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  const valid = validFilters(search, facets.filters);
  for (const f of facets.filters) {
    const v = valid[f.key];
    if (v === undefined) continue;
    if (f.kind === 'anyOf') {
      for (const o of v.split(',')) {
        const label = f.options.find((opt) => opt.value === o)!.label;
        chips.push({ key: `${f.key}:${o}`, label, remove: toggleOption(search, f.key, o) });
      }
    } else {
      const label =
        f.kind === 'isTrue' ? f.label : `${f.label}: ${atLeastLabel(Number(v), f.unit)}`;
      chips.push({ key: f.key, label, remove: { ...search, [f.key]: undefined } });
    }
  }
  const maxPrice = validMaxPrice(search, facets.priceCapsPaise);
  if (maxPrice) {
    chips.push({
      key: 'maxPrice',
      label: `Up to ${formatInr(fromRupees(maxPrice))}`,
      remove: { ...search, maxPrice: undefined },
    });
  }
  return chips;
}

/** Search with every filter cleared; the sort stays. */
export function clearFilters(search: ListingSearch): ListingSearch {
  return search.sort ? { sort: search.sort } : {};
}
