// Map tiles for address and delivery pins (D-187). The public OpenStreetMap server is allowed
// only outside production builds; production must set VITE_MAP_TILE_URL (and attribution), or
// the map is not offered and customers type the pincode.
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type MapTiles = { url: string; attribution: string };

export function resolveMapTiles(env: {
  PROD: boolean;
  VITE_MAP_TILE_URL?: string;
  VITE_MAP_TILE_ATTRIBUTION?: string;
}): MapTiles | null {
  if (env.VITE_MAP_TILE_URL) {
    return { url: env.VITE_MAP_TILE_URL, attribution: env.VITE_MAP_TILE_ATTRIBUTION ?? '' };
  }
  return env.PROD ? null : { url: OSM_URL, attribution: OSM_ATTRIBUTION };
}

export const mapTiles = resolveMapTiles(import.meta.env);
