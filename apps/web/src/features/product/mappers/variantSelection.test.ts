import { describe, expect, it } from 'vitest';
import { productFixture } from '@/test/fixtures';
import { optionGroups, selectedVariant, variantFor } from './variantSelection';

const product = productFixture();

describe('variant selection', () => {
  it('uses the URL variant, else the first you can buy', () => {
    expect(selectedVariant(product, 'BP4-8-256-FOR').sku).toBe('BP4-8-256-FOR');
    expect(selectedVariant(product, 'NOPE').sku).toBe('BP4-6-128-FOR');
    expect(selectedVariant(product, undefined).sku).toBe('BP4-6-128-FOR');
  });

  it('keeps other choices when switching one option', () => {
    const current = selectedVariant(product, 'BP4-6-128-FOR');
    expect(variantFor(product, current, 'storage', '8 GB + 256 GB').sku).toBe('BP4-8-256-FOR');
    expect(variantFor(product, current, 'colour', 'Graphite').sku).toBe('BP4-6-128-GRA');
  });

  it('keeps options with nothing to buy visible but unavailable', () => {
    const groups = optionGroups(product, selectedVariant(product, undefined));
    expect(groups.map((g) => [g.legend, g.value])).toEqual([
      ['Colour', 'Forest'],
      ['Storage', '6 GB + 128 GB'],
    ]);
    expect(groups[0]!.options).toEqual([
      { value: 'Forest', label: 'Forest', available: true },
      { value: 'Graphite', label: 'Graphite', available: false },
    ]);
  });
});
