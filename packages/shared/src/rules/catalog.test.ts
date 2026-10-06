import { describe, expect, it } from 'vitest';
import { attributeDefSchema, type AttributeDef, type CategoryConfig } from '../contracts/catalog';
import {
  cardVariant,
  priceCaps,
  filterFacets,
  formatAttributeValue,
  parseListingFilters,
  productAvailability,
  specGroups,
  variantAvailability,
} from './catalog';

const defs: AttributeDef[] = [
  { key: 'ram_gb', label: 'RAM', type: 'number', unit: 'GB', compat: false },
  { key: 'battery_mah', label: 'Battery', type: 'number', unit: 'mAh', compat: false },
  { key: 'nfc', label: 'NFC', type: 'bool', compat: false },
  {
    key: 'form_factor',
    label: 'Type',
    type: 'enum',
    options: ['tws', 'over_ear'],
    optionLabels: { tws: 'True wireless', over_ear: 'Over-ear' },
    compat: false,
  },
  { key: 'codecs', label: 'Codecs', type: 'list', options: ['AAC', 'LDAC'], compat: false },
  { key: 'chipset', label: 'Chipset', type: 'text', compat: false },
];
const byKey = (key: string) => defs.find((d) => d.key === key)!;
const config: CategoryConfig = {
  filters: ['ram_gb', 'nfc', 'form_factor', 'codecs', 'chipset'],
  specGroups: [
    { label: 'Performance', keys: ['chipset', 'ram_gb'] },
    { label: 'Battery', keys: ['battery_mah', 'unknown_key'] },
  ],
  compare: [],
};

describe('catalog', () => {
  it('D-16: values read as customers expect: labels, units, Yes/No', () => {
    expect(formatAttributeValue(byKey('battery_mah'), 5000)).toBe('5,000 mAh');
    expect(formatAttributeValue(byKey('nfc'), true)).toBe('Yes');
    expect(formatAttributeValue(byKey('nfc'), false)).toBe('No');
    expect(formatAttributeValue(byKey('form_factor'), 'over_ear')).toBe('Over-ear');
    expect(formatAttributeValue(byKey('codecs'), ['AAC', 'LDAC'])).toBe('AAC, LDAC');
    expect(formatAttributeValue(byKey('chipset'), ' Dimensity 7300 ')).toBe('Dimensity 7300');
  });

  it('D-16: option labels must name listed options', () => {
    expect(
      attributeDefSchema.safeParse({ ...byKey('form_factor'), optionLabels: { neckband: 'N' } })
        .success,
    ).toBe(false);
  });

  it('D-22: missing or malformed values are never guessed', () => {
    expect(formatAttributeValue(byKey('ram_gb'), undefined)).toBeUndefined();
    expect(formatAttributeValue(byKey('ram_gb'), '8')).toBeUndefined();
    expect(formatAttributeValue(byKey('nfc'), 'true')).toBeUndefined();
    expect(formatAttributeValue(byKey('codecs'), [])).toBeUndefined();
    expect(formatAttributeValue(byKey('form_factor'), '')).toBeUndefined();
    expect(formatAttributeValue(byKey('chipset'), '  ')).toBeUndefined();
  });

  it('D-14: spec groups follow category config; unfilled rows read "Not specified"', () => {
    expect(specGroups(config, defs, { ram_gb: 8 })).toEqual([
      { title: 'Performance', rows: [{ label: 'Chipset' }, { label: 'RAM', value: '8 GB' }] },
      { title: 'Battery', rows: [{ label: 'Battery' }] },
    ]);
  });

  it('D-65: pre-orders sell against their cap; live products against free stock', () => {
    const base = { unitsAvailable: 0, preorderCap: null, preorderSold: 0 };
    expect(variantAvailability({ ...base, status: 'live', unitsAvailable: 3 })).toBe('inStock');
    expect(variantAvailability({ ...base, status: 'live' })).toBe('outOfStock');
    expect(variantAvailability({ ...base, status: 'preorder', preorderCap: 5 })).toBe('preorder');
    expect(
      variantAvailability({ ...base, status: 'preorder', preorderCap: 5, preorderSold: 5 }),
    ).toBe('outOfStock');
    expect(variantAvailability({ ...base, status: 'preorder', unitsAvailable: 9 })).toBe(
      'outOfStock',
    );
  });

  it('D-17: discontinued and draft products are not sold', () => {
    const base = { unitsAvailable: 10, preorderCap: 5, preorderSold: 0 };
    expect(variantAvailability({ ...base, status: 'discontinued' })).toBe('outOfStock');
    expect(variantAvailability({ ...base, status: 'draft' })).toBe('outOfStock');
  });

  it('D-65: a product is in stock if any variant is, else pre-order if any is', () => {
    expect(productAvailability(['outOfStock', 'inStock', 'preorder'])).toBe('inStock');
    expect(productAvailability(['outOfStock', 'preorder'])).toBe('preorder');
    expect(productAvailability(['outOfStock'])).toBe('outOfStock');
    expect(productAvailability([])).toBe('outOfStock');
  });

  it('D-19: cards price the cheapest variant you can buy now, else the cheapest overall', () => {
    const v = (id: string, sellingPaise: number, availability: 'inStock' | 'outOfStock') => ({
      id,
      sellingPaise,
      availability,
    });
    expect(cardVariant([v('a', 100, 'outOfStock'), v('b', 200, 'inStock')])?.id).toBe('b');
    expect(cardVariant([v('a', 300, 'outOfStock'), v('b', 200, 'outOfStock')])?.id).toBe('b');
    expect(cardVariant([])).toBeUndefined();
  });

  it('D-18: filters parse by attribute type: any-of options, yes only, number minimums', () => {
    expect(
      parseListingFilters(
        { form_factor: 'tws,over_ear,tws', nfc: 'true', ram_gb: '8', codecs: 'LDAC' },
        config,
        defs,
      ),
    ).toEqual({
      ok: true,
      filters: [
        { key: 'form_factor', kind: 'anyOf', values: ['tws', 'over_ear'] },
        { key: 'nfc', kind: 'isTrue' },
        { key: 'ram_gb', kind: 'atLeast', value: 8 },
        { key: 'codecs', kind: 'anyOf', values: ['LDAC'] },
      ],
    });
  });

  it('D-18: only configured filter keys with valid values are accepted', () => {
    const err = (raw: Record<string, string>) => parseListingFilters(raw, config, defs);
    expect(err({ battery_mah: '4000' })).toEqual({
      ok: false,
      error: { code: 'UNKNOWN_FILTER', key: 'battery_mah' },
    });
    expect(err({ colour: 'red' })).toMatchObject({ error: { code: 'UNKNOWN_FILTER' } });
    for (const raw of [
      { form_factor: 'neckband' },
      { form_factor: ',' },
      { nfc: 'false' },
      { ram_gb: 'lots' },
      { ram_gb: ' ' },
      { chipset: 'x' },
    ]) {
      expect(err(raw)).toMatchObject({ ok: false, error: { code: 'INVALID_FILTER' } });
    }
  });

  it('D-18: facets offer only values listed products have, in config order', () => {
    const products = [
      { ram_gb: 8, nfc: false, form_factor: 'tws', codecs: ['AAC'] },
      { ram_gb: 12, nfc: false, form_factor: 'tws', codecs: ['AAC', 'LDAC'] },
      { ram_gb: 6 },
    ];
    expect(filterFacets(config, defs, products)).toEqual([
      { key: 'ram_gb', label: 'RAM', kind: 'atLeast', unit: 'GB', values: [8, 12] },
      {
        key: 'form_factor',
        label: 'Type',
        kind: 'anyOf',
        options: [{ value: 'tws', label: 'True wireless' }],
      },
      {
        key: 'codecs',
        label: 'Codecs',
        kind: 'anyOf',
        options: [
          { value: 'AAC', label: 'AAC' },
          { value: 'LDAC', label: 'LDAC' },
        ],
      },
    ]);
    expect(filterFacets(config, defs, [{ nfc: true, ram_gb: 8 }])).toEqual([
      { key: 'nfc', label: 'NFC', kind: 'isTrue' },
    ]);
    expect(filterFacets({ ...config, filters: ['missing'] }, defs, products)).toEqual([]);
  });

  it('D-18: price caps only offer limits that narrow the category', () => {
    expect(priceCaps({ min: 99_900, max: 1_200_000 })).toEqual([500_000, 1_000_000]);
    expect(priceCaps({ min: 1_000_000, max: 1_000_000 })).toEqual([]);
    expect(priceCaps(null)).toEqual([]);
  });
});
