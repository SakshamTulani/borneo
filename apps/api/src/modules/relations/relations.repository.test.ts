import { and, eq } from 'drizzle-orm';
import type { RelationType } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { relation } from '../../db/schema/index';
import { seedId } from '../../db/seed/index';
import { relationsService } from '../../services';
import { useTestDb } from '../../test/db';
import { loadRelationInputs } from './relations.repository';

const db = useTestDb();
const p = (slug: string) => seedId('product', slug);

async function edge(from: string, to: string, type: RelationType) {
  const [row] = await db
    .select({ source: relation.source, reason: relation.reason })
    .from(relation)
    .where(
      and(
        eq(relation.fromProductId, p(from)),
        eq(relation.toProductId, p(to)),
        eq(relation.type, type),
      ),
    );
  return row;
}

describe('materialised relations (seeded)', () => {
  it('D-21: attribute rules generate edges with a reason', async () => {
    expect(await edge('pulse-4', 'case-pulse-4', 'accessory')).toEqual({
      source: 'rule',
      reason: 'Made for Borneo Pulse 4',
    });
    expect(await edge('echo-buds-2', 'tips-echo-v2', 'consumable')).toMatchObject({
      source: 'rule',
    });
    expect(await edge('watch-s2-pro', 'strap-22mm', 'accessory')).toMatchObject({ source: 'rule' });
  });

  it('D-22: no edge when the attribute is missing or false', async () => {
    expect(await edge('nova-3', 'wireless-pad-15w', 'compatible')).toMatchObject({
      source: 'rule',
    });
    expect(await edge('pulse-4', 'wireless-pad-15w', 'compatible')).toBeUndefined();
    expect(await edge('nova-2', 'wireless-pad-15w', 'compatible')).toBeUndefined();
    expect(await edge('echo-buds-1', 'tips-echo-v2', 'consumable')).toBeUndefined();
  });

  it('D-20: product lines give previous/next generation and family-tier edges', async () => {
    expect(await edge('pulse-4', 'pulse-3', 'prev_gen')).toMatchObject({ source: 'line' });
    expect(await edge('nova-3', 'nova-4', 'next_gen')).toMatchObject({ source: 'line' });
    expect(await edge('apex-2', 'apex-2-premium', 'family_tier')).toMatchObject({ source: 'line' });
  });

  it('D-21: manual overrides add edges and remove rule edges', async () => {
    expect(await edge('apex-2', 'echo-buds-2-pro', 'complementary')).toEqual({
      source: 'manual',
      reason: 'Hi-res earbuds with LDAC',
    });
    expect(await edge('apex-2', 'cable-usb-c-1m', 'compatible')).toBeUndefined();
    expect(await edge('nova-3', 'cable-usb-c-1m', 'compatible')).toMatchObject({ source: 'rule' });
  });

  it('D-17: discontinued products keep their edges', async () => {
    const inputs = await loadRelationInputs(db);
    expect(inputs.products.some((x) => x.id === p('pulse-3'))).toBe(true);
    expect(await edge('pulse-3', 'cable-usb-c-1m', 'compatible')).toMatchObject({ source: 'rule' });
  });

  it('rematerialising is idempotent and reports no conflicts', async () => {
    const before = await db.select().from(relation);
    const result = await relationsService(db).materialize();
    const after = await db.select().from(relation);

    expect(result).toEqual({ edges: before.length, conflicts: [] });
    expect(new Set(after.map((r) => JSON.stringify(r)))).toEqual(
      new Set(before.map((r) => JSON.stringify(r))),
    );
  });
});
