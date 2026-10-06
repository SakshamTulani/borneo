import { describe, expect, it } from 'vitest';
import { checkRuleIds } from './ruleIds.ts';

const decisions = '| D-35 | One coupon | v1 |\n| D-36 | Flash | v1 |';
const rule = 'packages/shared/src/rules/offers.ts';
const test = 'packages/shared/src/rules/offers.test.ts';

describe('checkRuleIds', () => {
  it('passes when every cited id is known and tested', () => {
    const files = new Map([
      [rule, '/** D-35, D-36 */'],
      [test, "it('D-35: one coupon', () => {});\nit('D-36: flash', () => {});"],
    ]);
    expect(checkRuleIds(files, decisions)).toEqual([]);
  });

  it('expands ranges like D-35–36', () => {
    const files = new Map([
      [rule, '/** D-35–36 */'],
      [test, "it('D-35: one coupon', () => {});"],
    ]);
    expect(checkRuleIds(files, decisions)).toEqual([`${rule}: no test named "D-36: …" in ${test}`]);
  });

  it('reports unknown ids, untested ids, missing tests and rules citing nothing', () => {
    const files = new Map([
      [rule, '/** D-35, D-99 */'],
      [test, "it('D-99: something', () => {});"],
      ['packages/shared/src/rules/hold.ts', '/** D-56 */'],
      ['packages/shared/src/rules/misc.ts', 'export const x = 1;'],
      ['packages/shared/src/rules/misc.test.ts', ''],
    ]);
    expect(checkRuleIds(files, decisions)).toEqual([
      `${rule}: no test named "D-35: …" in ${test}`,
      `${rule}: D-99 is not in docs/DECISIONS.md`,
      'packages/shared/src/rules/hold.ts: missing packages/shared/src/rules/hold.test.ts',
      'packages/shared/src/rules/misc.ts: cites no D-xx rule',
    ]);
  });
});
