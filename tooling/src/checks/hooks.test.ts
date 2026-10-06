import { describe, expect, it } from 'vitest';
import { checkHookFile } from './hooks.ts';

const hooks = 'apps/web/src/features/cart/hooks/';

describe('checkHookFile', () => {
  it('accepts one correctly named hook per file', () => {
    expect(checkHookFile(`${hooks}useCartQuery.ts`, 'export function useCartQuery() {}')).toEqual(
      [],
    );
    expect(
      checkHookFile(`${hooks}useCheckoutForm.ts`, 'export function useCheckoutForm() {}'),
    ).toEqual([]);
    expect(
      checkHookFile(`${hooks}usePriceResult.ts`, 'export const usePriceResult = () => 1;'),
    ).toEqual([]);
  });

  it('rejects bad names, mismatches, two hooks and hooks outside hooks/', () => {
    expect(checkHookFile(`${hooks}useCart.ts`, 'export function useCart() {}')).toEqual([
      `${hooks}useCart.ts: file name must be use<Name>Query, use<Feature>Result or use<Feature>Form`,
    ]);
    expect(checkHookFile(`${hooks}useCartQuery.ts`, 'export function useOtherQuery() {}')).toEqual([
      `${hooks}useCartQuery.ts: hook useOtherQuery must match file name useCartQuery`,
    ]);
    expect(
      checkHookFile(
        `${hooks}useCartQuery.ts`,
        'export function useCartQuery() {}\nfunction useHelperQuery() {}',
      ),
    ).toEqual([`${hooks}useCartQuery.ts: must declare exactly one hook, found 2`]);
    expect(
      checkHookFile('apps/web/src/features/cart/ui/Cart.tsx', 'function useLocalThing() {}'),
    ).toEqual([
      "apps/web/src/features/cart/ui/Cart.tsx: hook useLocalThing must live in the feature's hooks/ folder",
    ]);
  });
});
