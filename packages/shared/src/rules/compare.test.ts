import { describe, expect, it } from 'vitest';
import type { AttributeDef } from '../contracts/catalog';
import { COMPARE_MAX, COMPARE_MAX_MOBILE, compareRows, toggleCompare } from './compare';

const defs: AttributeDef[] = [
  { key: 'anc', label: 'Active noise cancellation', type: 'bool', compat: false },
  { key: 'playback_hours', label: 'Playback', type: 'number', unit: 'h', compat: false },
];

describe('compare', () => {
  it('D-122: up to 4 on desktop and 3 on mobile; a full selection refuses, never drops', () => {
    expect([COMPARE_MAX, COMPARE_MAX_MOBILE]).toEqual([4, 3]);
    let s: string[] = [];
    for (const slug of ['a', 'b', 'c', 'd']) s = toggleCompare(s, slug).selection;
    expect(toggleCompare(s, 'e')).toEqual({ selection: ['a', 'b', 'c', 'd'], refused: true });
    expect(toggleCompare(s, 'b')).toEqual({ selection: ['a', 'c', 'd'], refused: false });
  });

  it('D-14: rows follow the category compare config and flag differences', () => {
    const rows = compareRows(
      defs,
      ['playback_hours', 'anc', 'unknown'],
      [
        { attributes: { anc: true, playback_hours: 8 } },
        { attributes: { anc: true, playback_hours: 10 } },
      ],
    );
    expect(rows).toEqual([
      { key: 'playback_hours', label: 'Playback', values: ['8 h', '10 h'], differs: true },
      { key: 'anc', label: 'Active noise cancellation', values: ['Yes', 'Yes'], differs: false },
    ]);
  });

  it('D-22: a value not in the structured data shows as not stated, never guessed', () => {
    const [row] = compareRows(defs, ['anc'], [{ attributes: {} }, { attributes: { anc: false } }]);
    expect(row!.values).toEqual([null, 'No']);
  });
});
