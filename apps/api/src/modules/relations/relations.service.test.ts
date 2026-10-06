import { describe, expect, it } from 'vitest';
import type { ProductRef, RelationEdge } from '@borneo/shared';
import type { RelationInputs } from './relations.repository';
import { createRelationsService } from './relations.service';

const ref = (id: string, categoryId: string, attributes: Record<string, unknown>): ProductRef => ({
  id,
  name: id,
  categoryId,
  lineId: `line-${id}`,
  generation: 1,
  familyTier: 'standard',
  attributes,
});

function setup(inputs: RelationInputs) {
  const written: RelationEdge[][] = [];
  const service = createRelationsService({
    loadInputs: async () => inputs,
    replaceRelations: async (edges) => {
      written.push(edges);
    },
  });
  return { service, written };
}

const products = [
  ref('phone', 'phones', { connector: 'usb_c' }),
  ref('cable', 'acc', { connector: 'usb_c' }),
  ref('buds', 'audio', {}),
];
const rules = [
  {
    id: 'r1',
    type: 'compatible' as const,
    fromCategoryId: 'phones',
    toCategoryId: 'acc',
    match: { kind: 'equal' as const, fromAttr: 'connector', toAttr: 'connector' },
    reasonTemplate: 'Works with {from}',
  },
];

describe('relations service', () => {
  it('D-21: writes rule edges plus manual adds, minus manual removes', async () => {
    const { service, written } = setup({
      products,
      rules,
      overrides: [
        {
          fromProductId: 'phone',
          toProductId: 'buds',
          type: 'complementary',
          action: 'add',
          reason: 'Pairs well',
        },
      ],
    });

    expect(await service.materialize()).toEqual({ edges: 2, conflicts: [] });
    expect(written).toHaveLength(1);
    expect(written[0]).toEqual(
      expect.arrayContaining([
        {
          fromProductId: 'phone',
          toProductId: 'cable',
          type: 'compatible',
          source: 'rule',
          reason: 'Works with phone',
        },
        {
          fromProductId: 'phone',
          toProductId: 'buds',
          type: 'complementary',
          source: 'manual',
          reason: 'Pairs well',
        },
      ]),
    );
  });

  it('D-27: an edge both added and removed is dropped and reported as a conflict', async () => {
    const add = {
      fromProductId: 'phone',
      toProductId: 'cable',
      type: 'compatible' as const,
      action: 'add' as const,
    };
    const remove = { ...add, action: 'remove' as const };
    const { service, written } = setup({ products, rules, overrides: [add, remove] });

    expect(await service.materialize()).toEqual({ edges: 0, conflicts: [add] });
    expect(written[0]).toEqual([]);
  });
});
