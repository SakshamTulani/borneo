import { describe, expect, it } from 'vitest';
import type { AttributeDef } from '../contracts/catalog';
import { FINDERS, runFinder, type FinderCandidate } from './finder';

const defs: AttributeDef[] = [
  { key: 'battery_mah', label: 'Battery', type: 'number', unit: 'mAh', compat: false },
  { key: 'main_camera_mp', label: 'Main camera', type: 'number', unit: 'MP', compat: false },
  { key: 'five_g', label: '5G', type: 'bool', compat: false },
  { key: 'nfc', label: 'NFC', type: 'bool', compat: false },
  {
    key: 'ip_rating',
    label: 'Water and dust',
    type: 'enum',
    options: ['IP52', 'IP54', 'IP64', 'IP68'],
    compat: false,
  },
];
const phone = (
  id: string,
  rupees: number,
  attributes: FinderCandidate['attributes'],
  launched = '2025-01-01',
): FinderCandidate => ({ id, pricePaise: rupees * 100, attributes, launched });
const phones = [
  phone('budget', 14_999, { battery_mah: 6000, main_camera_mp: 50, five_g: true, nfc: false }),
  phone('mid', 27_999, {
    battery_mah: 5000,
    main_camera_mp: 108,
    five_g: true,
    nfc: true,
    ip_rating: 'IP68',
  }),
  phone(
    'mid-old',
    24_999,
    { battery_mah: 5000, main_camera_mp: 64, five_g: true, nfc: true },
    '2024-01-01',
  ),
  phone('flagship', 69_999, {
    battery_mah: 4800,
    main_camera_mp: 200,
    five_g: true,
    nfc: true,
    ip_rating: 'IP68',
  }),
];
const run = (answers: Record<string, string[]>) =>
  runFinder(FINDERS.phones!, answers, phones, defs);

describe('finder', () => {
  it('D-13: finders exist for the full-depth categories only', () => {
    expect(Object.keys(FINDERS).sort()).toEqual(['audio', 'phones']);
    for (const f of Object.values(FINDERS))
      for (const q of f.questions) expect(q.options.length).toBeGreaterThan(1);
  });

  it('D-225: budget and must-haves are hard; preferences rank what is left', () => {
    const r = run({ budget: ['20to40'], priority: ['camera'], needs: ['nfc'] });
    expect(r.matches.map((m) => m.id)).toEqual(['mid', 'mid-old']);
    expect(run({ budget: ['under20'], priority: ['battery'] }).matches.map((m) => m.id)).toEqual([
      'budget',
    ]);
  });

  it('D-225: with no preference, newest first then cheaper', () => {
    expect(run({ budget: ['any'], priority: ['balanced'] }).matches.map((m) => m.id)).toEqual([
      'budget',
      'mid',
      'flagship',
      'mid-old',
    ]);
  });

  it('D-225: when nothing fits, names the answer to drop that gives the most results', () => {
    const r = run({ budget: ['under20'], needs: ['nfc', 'water'] });
    expect(r.matches).toEqual([]);
    expect(r.relax).toEqual({ question: 'budget', option: 'under20', count: 2 });
  });

  it('D-22: reasons name structured facts only; a missing attribute never matches a must-have', () => {
    const r = run({ budget: ['20to40'], priority: ['camera'], needs: ['water'] });
    expect(r.matches).toEqual([
      {
        id: 'mid',
        reasons: ['Within ₹20,000 to ₹40,000', 'Main camera: 108 MP', 'Water and dust: IP68'],
      },
    ]);
  });

  it('D-19: budgets compare the lowest regular price', () => {
    const edge = [phone('edge', 20_000, { five_g: true })];
    expect(runFinder(FINDERS.phones!, { budget: ['under20'] }, edge, defs).matches).toEqual([]);
    expect(
      runFinder(FINDERS.phones!, { budget: ['20to40'] }, edge, defs).matches.map((m) => m.id),
    ).toEqual(['edge']);
  });
});
