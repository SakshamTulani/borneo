import { describe, expect, it } from 'vitest';
import type { ProductRef, RelationRule } from '../contracts/catalog';
import { lineEdges, materializeRelations } from './relations';

const prod = (
  id: string,
  categoryId: string,
  attributes: Record<string, unknown>,
  lineId = id,
  generation = 1,
  familyTier: ProductRef['familyTier'] = 'standard',
): ProductRef => ({
  id,
  name: id.toUpperCase(),
  categoryId,
  lineId,
  generation,
  familyTier,
  attributes,
});
const phone = prod('phone', 'smartphones', { connector: 'usb-c' });
const oldPhone = prod('old', 'smartphones', {});
const cable = prod('cable', 'accessories', { connector: 'usb-c' });
const lightning = prod('lightning', 'accessories', { connector: 'lightning' });
const vac = prod('vac', 'robot-vacuums', { filter_model: 'F1' });
const filters = prod('filters', 'accessories', { fits_filter_models: ['F1', 'F2'] });

const rules: RelationRule[] = [
  {
    id: 'r1',
    type: 'accessory',
    fromCategoryId: 'smartphones',
    toCategoryId: 'accessories',
    match: { kind: 'equal', fromAttr: 'connector', toAttr: 'connector' },
    reasonTemplate: 'Fits your {from}',
  },
  {
    id: 'r2',
    type: 'consumable',
    fromCategoryId: 'robot-vacuums',
    toCategoryId: 'accessories',
    match: { kind: 'contains', fromAttr: 'filter_model', toAttr: 'fits_filter_models' },
    reasonTemplate: 'Replacement filters for {from}',
  },
];
const products = [phone, oldPhone, cable, lightning, vac, filters];
const edgesOf = (r: ReturnType<typeof materializeRelations>) =>
  r.edges.map((e) => `${e.fromProductId}>${e.toProductId}:${e.type}:${e.source}`).sort();

describe('relations', () => {
  it('D-21: attribute rules generate default edges with reasons', () => {
    const r = materializeRelations({ products, rules, overrides: [] });
    expect(edgesOf(r)).toEqual(['phone>cable:accessory:rule', 'vac>filters:consumable:rule']);
    expect(r.edges.find((e) => e.toProductId === 'filters')?.reason).toBe(
      'Replacement filters for VAC',
    );
  });

  it('D-22: a missing attribute never matches', () => {
    expect(
      edgesOf(materializeRelations({ products, rules, overrides: [] })).some((e) =>
        e.startsWith('old>'),
      ),
    ).toBe(false);
  });

  it('D-22: "contains" needs a list on one side', () => {
    const scalar: RelationRule = {
      ...rules[1]!,
      match: { kind: 'contains', fromAttr: 'filter_model', toAttr: 'filter_model' },
    };
    const twin = prod('twin', 'accessories', { filter_model: 'F1' });
    expect(
      materializeRelations({ products: [vac, twin], rules: [scalar], overrides: [] }).edges,
    ).toEqual([]);
  });

  it('D-21: manual overrides add and remove edges', () => {
    const r = materializeRelations({
      products,
      rules,
      overrides: [
        { fromProductId: 'phone', toProductId: 'cable', type: 'accessory', action: 'remove' },
        {
          fromProductId: 'phone',
          toProductId: 'lightning',
          type: 'complementary',
          action: 'add',
          reason: 'Charge older devices too',
        },
        { fromProductId: 'phone', toProductId: 'ghost', type: 'accessory', action: 'add' },
      ],
    });
    expect(edgesOf(r)).toEqual([
      'phone>lightning:complementary:manual',
      'vac>filters:consumable:rule',
    ]);
  });

  it('D-27: a remove beats an add for the same edge and is reported', () => {
    const add = {
      fromProductId: 'vac',
      toProductId: 'filters',
      type: 'consumable' as const,
      action: 'add' as const,
    };
    const r = materializeRelations({
      products,
      rules,
      overrides: [add, { ...add, action: 'remove' }],
    });
    expect(edgesOf(r)).toEqual(['phone>cable:accessory:rule']);
    expect(r.conflicts).toEqual([add]);
  });

  it('D-20: same-line edges for previous/next generation and family tiers', () => {
    const line = [
      prod('p4', 'smartphones', {}, 'pulse', 4),
      prod('p5', 'smartphones', {}, 'pulse', 5),
      prod('p5pro', 'smartphones', {}, 'pulse', 5, 'pro'),
    ];
    expect(
      lineEdges(line)
        .map((e) => `${e.fromProductId}>${e.toProductId}:${e.type}`)
        .sort(),
    ).toEqual([
      'p4>p5:next_gen',
      'p4>p5pro:next_gen',
      'p5>p4:prev_gen',
      'p5>p5pro:family_tier',
      'p5pro>p4:prev_gen',
      'p5pro>p5:family_tier',
    ]);
  });
});
