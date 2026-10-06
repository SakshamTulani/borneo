import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { colors, contrastPairs } from './tokens';

const css = readFileSync(join(__dirname, '../../index.css'), 'utf8');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const hexOf = (name: string) => colors.find((c) => c.name === name)!.hex;

describe('design tokens', () => {
  it.each(colors)('index.css defines --$name as $hex', ({ name, hex }) => {
    expect(css).toContain(`--${name}: ${hex};`);
  });

  it.each(contrastPairs)('$fg on $bg meets $min:1', ({ fg, bg, min }) => {
    expect(contrast(hexOf(fg), hexOf(bg))).toBeGreaterThanOrEqual(min);
  });
});
