import { describe, expect, it } from 'vitest';
import type { FilterFacet } from '@borneo/shared';
import {
  clearFilters,
  parseListingSearch,
  priceOptions,
  toActiveFilters,
  toFilterControls,
  toggleOption,
  toListingParams,
} from './listingSearch';

const filters: FilterFacet[] = [
  {
    key: 'form_factor',
    label: 'Type',
    kind: 'anyOf',
    options: [
      { value: 'tws', label: 'True wireless' },
      { value: 'over_ear', label: 'Over-ear' },
    ],
  },
  { key: 'anc', label: 'Active noise cancellation', kind: 'isTrue' },
  { key: 'playback_hours', label: 'Playback', kind: 'atLeast', unit: 'h', values: [8, 30] },
];
const facets = { filters, priceCapsPaise: [500_000, 1_000_000] };

describe('listing search (filters in the URL, D-18)', () => {
  it('keeps valid params with router-parsed types and drops the rest', () => {
    expect(
      parseListingSearch({
        sort: 'price_asc',
        maxPrice: 30000,
        anc: true,
        playback_hours: 8,
        form_factor: 'tws,over_ear',
        'Bad-Key': 'x',
        nested: { a: 1 },
      }),
    ).toEqual({
      sort: 'price_asc',
      maxPrice: 30000,
      anc: true,
      playback_hours: 8,
      form_factor: 'tws,over_ear',
    });
    expect(parseListingSearch({ sort: 'newest', maxPrice: -5 })).toEqual({});
    expect(parseListingSearch({ sort: 'popular', maxPrice: '30000' })).toEqual({});
  });

  it('sends only offered filters and values to the API, price in paise', () => {
    expect(
      toListingParams(
        'audio',
        {
          sort: 'price_desc',
          maxPrice: 10000,
          form_factor: 'tws,neckband',
          anc: true,
          playback_hours: 30,
          colour: 'red',
        },
        facets,
      ),
    ).toEqual({
      category: 'audio',
      sort: 'price_desc',
      maxPricePaise: '1000000',
      form_factor: 'tws',
      anc: 'true',
      playback_hours: '30',
    });
    expect(
      toListingParams('audio', { anc: 'yes', form_factor: 'neckband', maxPrice: 7000 }, facets),
    ).toEqual({ category: 'audio' });
  });

  it('builds controls with the current choices', () => {
    const controls = toFilterControls(filters, { form_factor: 'over_ear', playback_hours: 30 });
    expect(controls[0]).toMatchObject({
      kind: 'anyOf',
      options: [
        { value: 'tws', checked: false },
        { value: 'over_ear', checked: true },
      ],
    });
    expect(controls[1]).toMatchObject({ kind: 'isTrue', checked: false });
    expect(controls[2]).toEqual({
      kind: 'atLeast',
      key: 'playback_hours',
      label: 'Playback',
      value: '30',
      options: [
        { value: '8', label: '8 h or more' },
        { value: '30', label: '30 h or more' },
      ],
    });
  });

  it('toggles options in and out of a comma list', () => {
    const one = toggleOption({}, 'form_factor', 'tws');
    expect(one).toEqual({ form_factor: 'tws' });
    const two = toggleOption(one, 'form_factor', 'over_ear');
    expect(two).toEqual({ form_factor: 'tws,over_ear' });
    expect(
      toggleOption(toggleOption(two, 'form_factor', 'tws'), 'form_factor', 'over_ear'),
    ).toEqual({ form_factor: undefined });
  });

  it('lists applied filters as removable chips and clears all but the sort', () => {
    const search = { sort: 'price_asc' as const, form_factor: 'tws', anc: true, maxPrice: 5000 };
    const chips = toActiveFilters(facets, search);
    expect(chips.map((c) => c.label)).toEqual([
      'True wireless',
      'Active noise cancellation',
      'Up to ₹5,000',
    ]);
    expect(chips[1]!.remove).toEqual({ ...search, anc: undefined });
    expect(clearFilters(search)).toEqual({ sort: 'price_asc' });
    expect(clearFilters({ anc: true })).toEqual({});
  });

  it('reads option values the router parsed as numbers or booleans', () => {
    const numeric = {
      filters: [
        {
          key: 'storage',
          label: 'Storage',
          kind: 'anyOf' as const,
          options: [{ value: '128', label: '128 GB' }],
        },
      ],
      priceCapsPaise: [],
    };
    expect(toListingParams('phones', { storage: 128 }, numeric)).toEqual({
      category: 'phones',
      storage: '128',
    });
  });

  it('labels the category price caps in rupees', () => {
    expect(priceOptions([500_000, 1_000_000])).toEqual([
      { value: '5000', label: 'Up to ₹5,000' },
      { value: '10000', label: 'Up to ₹10,000' },
    ]);
  });
});
