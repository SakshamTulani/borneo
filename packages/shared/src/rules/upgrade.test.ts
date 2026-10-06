import { describe, expect, it } from 'vitest';
import {
  isUpgrade,
  upgradeBadge,
  upgradeStrip,
  type OwnedItem,
  type UpgradeProduct,
} from './upgrade';

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
});
