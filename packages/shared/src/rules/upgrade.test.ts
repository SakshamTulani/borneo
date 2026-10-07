import { describe, expect, it } from 'vitest';
import {
  isUpgrade,
  upgradeBadge,
  lineCompareCandidates,
  newerModel,
  upgradeStrip,
  whatYouGain,
  type OwnedItem,
  type UpgradeProduct,
} from './upgrade';
import { formatAttributeValue } from './catalog';
import type { AttributeDef } from '../contracts/catalog';

const p = (
  id: string,
  generation: number,
  familyTier: UpgradeProduct['familyTier'],
  lineId = 'pulse',
): UpgradeProduct => ({
  id,
  name: `Pulse ${generation} ${familyTier}`,
  lineId,
  generation,
  familyTier,
});
const own = (prod: UpgradeProduct, returnWindowEndsAt = 0): OwnedItem => ({
  ...prod,
  returnWindowEndsAt,
});
const now = 10_000;

describe('upgrade', () => {
  it('D-131: newer generation or higher tier in the same line only', () => {
    expect(isUpgrade(p('a', 4, 'pro'), p('b', 5, 'pro'))).toBe(true);
    expect(isUpgrade(p('a', 5, 'standard'), p('b', 5, 'pro'))).toBe(true);
    expect(isUpgrade(p('a', 5, 'pro'), p('b', 6, 'standard'))).toBe(false); // lower tier = downgrade
    expect(isUpgrade(p('a', 5, 'pro'), p('b', 4, 'premium'))).toBe(false); // older generation
    expect(isUpgrade(p('a', 5, 'pro'), p('b', 6, 'pro', 'pods'))).toBe(false); // different line
    expect(isUpgrade(p('a', 5, 'pro'), p('a', 5, 'pro'))).toBe(false);
  });

  it('D-130: badge names the owned product', () => {
    expect(upgradeBadge([own(p('a', 4, 'pro'))], p('b', 5, 'pro'), now)).toEqual({
      fromName: 'Pulse 4 pro',
    });
  });

  it('D-24: only owned (delivered) items in the same line count', () => {
    expect(upgradeBadge([], p('b', 5, 'pro'), now)).toBeUndefined();
    expect(
      upgradeBadge([own(p('x', 1, 'standard', 'pods'))], p('b', 5, 'pro'), now),
    ).toBeUndefined();
  });

  it('D-132: hidden if they own this model or a newer one', () => {
    expect(
      upgradeBadge([own(p('a', 4, 'pro')), own(p('b', 5, 'pro'))], p('b', 5, 'pro'), now),
    ).toBeUndefined();
    expect(
      upgradeBadge([own(p('a', 4, 'pro')), own(p('c', 6, 'pro'))], p('b', 5, 'pro'), now),
    ).toBeUndefined();
  });

  it('D-132: hidden while the owned item is inside its return window', () => {
    expect(upgradeBadge([own(p('a', 4, 'pro'), now)], p('b', 5, 'pro'), now)).toBeUndefined();
    expect(upgradeBadge([own(p('a', 4, 'pro'), now - 1)], p('b', 5, 'pro'), now)).toEqual({
      fromName: 'Pulse 4 pro',
    });
  });

  it('D-137: compares against the newest owned item in the line', () => {
    expect(
      upgradeBadge([own(p('old', 2, 'standard')), own(p('a', 4, 'pro'))], p('b', 5, 'pro'), now),
    ).toEqual({ fromName: 'Pulse 4 pro' });
  });

  it('D-138: tiers rank standard < pro < premium', () => {
    expect(isUpgrade(p('a', 5, 'standard'), p('b', 5, 'premium'))).toBe(true);
    expect(isUpgrade(p('a', 5, 'premium'), p('b', 5, 'pro'))).toBe(false);
  });

  it('D-121: home strip lists upgrades for logged-in owners only', () => {
    expect(upgradeStrip([], [p('p6', 6, 'pro')], now)).toEqual([]);
  });

  it('D-136: strip shows the natural successor of each owned line, newer generations only', () => {
    const catalog = [
      p('s5', 5, 'standard'),
      p('p5', 5, 'pro'),
      p('m5', 5, 'premium'),
      p('p6', 6, 'pro'),
      p('m6', 6, 'premium'),
      p('pods2', 2, 'standard', 'pods'),
    ];
    const strip = upgradeStrip(
      [own(p('p4', 4, 'pro')), own(p('pods2', 2, 'standard', 'pods'))],
      catalog,
      now,
    );
    expect(strip.map((s) => [s.from.id, s.to.id])).toEqual([['p4', 'p6']]);
  });

  it('D-136: newest generation that is an upgrade, never a lower tier', () => {
    expect(
      upgradeStrip([own(p('p2', 2, 'pro'))], [p('s4', 4, 'standard'), p('p3', 3, 'pro')], now)[0]
        ?.to.id,
    ).toBe('p3');
  });

  it('D-136: falls back to the nearest higher tier; skips lines inside the return window', () => {
    expect(
      upgradeStrip(
        [own(p('s4', 4, 'standard'))],
        [p('m6', 6, 'premium'), p('p6', 6, 'pro')],
        now,
      )[0]?.to.id,
    ).toBe('p6');
    expect(upgradeStrip([own(p('s4', 4, 'standard'), now)], [p('p6', 6, 'pro')], now)).toEqual([]);
  });

  const gainDefs: AttributeDef[] = [
    { key: 'battery_mah', label: 'Battery', type: 'number', unit: 'mAh', compat: false },
    { key: 'weight_g', label: 'Weight', type: 'number', unit: 'g', compat: false },
    { key: 'nfc', label: 'NFC', type: 'bool', compat: false },
    { key: 'ip', label: 'Water', type: 'enum', options: ['IP54', 'IP68'], compat: false },
    { key: 'codecs', label: 'Codecs', type: 'list', options: ['SBC', 'LDAC'], compat: false },
    { key: 'chipset', label: 'Chipset', type: 'text', compat: false },
  ];

  it('D-133: what you gain lists differences against the owned device', () => {
    const r = whatYouGain(
      gainDefs,
      ['battery_mah', 'chipset'],
      { battery_mah: 5000, chipset: 'A' },
      { battery_mah: 5500, chipset: 'B' },
      formatAttributeValue,
    );
    expect(r.gains).toEqual([{ label: 'Battery', from: '5,000 mAh', to: '5,500 mAh' }]);
    expect(r.changes).toEqual([{ label: 'Chipset', from: 'A', to: 'B' }]);
  });

  it('D-226: gains are higher numbers (lighter weight), new features, later options, added list items', () => {
    const r = whatYouGain(
      gainDefs,
      gainDefs.map((d) => d.key),
      { battery_mah: 5000, weight_g: 200, nfc: false, ip: 'IP54', codecs: ['SBC'] },
      { battery_mah: 4800, weight_g: 180, nfc: true, ip: 'IP68', codecs: ['SBC', 'LDAC'] },
      formatAttributeValue,
    );
    expect(r.gains.map((g) => g.label)).toEqual(['Weight', 'NFC', 'Water', 'Codecs']);
    expect(r.changes.map((c) => c.label)).toEqual(['Battery']);
    const same = whatYouGain(gainDefs, ['nfc'], { nfc: true }, { nfc: true }, formatAttributeValue);
    expect(same).toEqual({ gains: [], changes: [] });
  });

  it('D-22: an unknown value on the candidate is never a gain or a change', () => {
    const r = whatYouGain(
      gainDefs,
      ['nfc', 'battery_mah'],
      { nfc: false, battery_mah: 5000 },
      {},
      formatAttributeValue,
    );
    expect(r).toEqual({ gains: [], changes: [] });
  });
});

describe('newer model and compare picks', () => {
  const p = (
    id: string,
    generation: number,
    familyTier: 'standard' | 'pro' | 'premium',
    status: 'live' | 'preorder' | 'discontinued' = 'live',
  ) => ({ id, slug: id, name: id, lineId: 'pulse', generation, familyTier, status });
  const line = [
    p('p3', 3, 'standard', 'discontinued'),
    p('p4', 4, 'standard'),
    p('p4pro', 4, 'pro'),
    p('p5', 5, 'standard', 'preorder'),
    p('p5pro', 5, 'pro'),
  ];

  it('D-237: points to the newest generation that is sold, same tier first, pre-orders included', () => {
    expect(newerModel(p('p4', 4, 'standard'), line)).toMatchObject({
      product: { id: 'p5' },
      kind: 'newerGeneration',
    });
    expect(newerModel(p('p4pro', 4, 'pro'), line)?.product.id).toBe('p5pro');
  });

  it('D-237: without a newer generation, a higher tier of this one; nothing for the top model', () => {
    const now = line.filter((x) => x.generation < 5);
    expect(newerModel(p('p4', 4, 'standard'), now)).toMatchObject({
      product: { id: 'p4pro' },
      kind: 'higherTier',
    });
    expect(newerModel(p('p4pro', 4, 'pro'), now)).toBeUndefined();
    expect(
      newerModel(p('p4', 4, 'standard'), [p('p5', 5, 'standard', 'discontinued')]),
    ).toBeUndefined();
  });

  it('D-238: previous model (even if no longer sold), newer model, then siblings; at most 3', () => {
    const picks = lineCompareCandidates(p('p4', 4, 'standard'), line);
    expect(picks.map((x) => [x.product.id, x.relation])).toEqual([
      ['p3', 'previous'],
      ['p5', 'newer'],
      ['p4pro', 'sibling'],
    ]);
    expect(
      lineCompareCandidates(p('p3', 3, 'standard', 'discontinued'), [p('p3', 3, 'standard')]),
    ).toEqual([]);
  });
});
