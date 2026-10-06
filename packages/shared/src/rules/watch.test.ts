import { describe, expect, it } from 'vitest';
import { canWatch } from './watch';

describe('watch', () => {
  it('D-147: only out-of-stock products can be watched', () => {
    expect(canWatch('outOfStock')).toBe(true);
    expect(canWatch('inStock')).toBe(false);
    expect(canWatch('preorder')).toBe(false);
  });
});
