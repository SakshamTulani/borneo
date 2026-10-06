import { describe, expect, it } from 'vitest';
import { resolveMapTiles } from './mapTiles';

describe('resolveMapTiles', () => {
  it('D-187: public OSM tiles only outside production builds', () => {
    expect(resolveMapTiles({ PROD: false })?.url).toContain('tile.openstreetmap.org');
    expect(resolveMapTiles({ PROD: true })).toBeNull();
  });

  it('D-187: a configured provider wins everywhere', () => {
    const env = { VITE_MAP_TILE_URL: 'https://tiles.example/{z}/{x}/{y}.png' };
    expect(resolveMapTiles({ PROD: true, ...env })).toEqual({
      url: env.VITE_MAP_TILE_URL,
      attribution: '',
    });
  });
});
