import { describe, expect, it } from 'vitest';
import { checkBudget } from './budget';

const ok = [
  { name: 'index-abc.js', gzipBytes: 120_000 },
  { name: 'utils-abc.js', gzipBytes: 40_000 },
  { name: 'leaflet-src-abc.js', gzipBytes: 43_000 },
  { name: 'cart-abc.js', gzipBytes: 8_000 },
  { name: 'index-abc.css', gzipBytes: 12_000 },
];

describe('performance budget', () => {
  it('passes a build inside the budget', () => {
    expect(checkBudget(ok)).toEqual([]);
  });

  it('names every asset over its budget', () => {
    const errors = checkBudget([
      { name: 'index-abc.js', gzipBytes: 160_000 },
      { name: 'utils-abc.js', gzipBytes: 50_000 },
      { name: 'big-abc.js', gzipBytes: 70_000 },
      { name: 'index-abc.css', gzipBytes: 30_000 },
    ]);
    expect(errors).toEqual([
      'entry index-abc.js is 160.0 kB (budget 150.0 kB)',
      'first-load JS is 210.0 kB (budget 200.0 kB)',
      'chunk big-abc.js is 70.0 kB (budget 60.0 kB)',
      'leaflet is not its own chunk: the map must load only when opened',
      'CSS is 30.0 kB (budget 25.0 kB)',
    ]);
  });

  it('asks for a build when there is none', () => {
    expect(checkBudget([])).toEqual(['no entry chunk (index-*.js) found: build first']);
  });
});
