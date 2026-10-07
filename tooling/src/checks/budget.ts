/** Performance budget for the web client (Phase O), in gzipped bytes. */
export const BUDGET = {
  /** The entry chunk every page loads (React, router, Query, shell). */
  entryJs: 150_000,
  /** Any other chunk, loaded per route or on demand. */
  chunkJs: 60_000,
  /** All first-load JS: the entry plus chunks it always pulls (`utils`). */
  firstLoadJs: 200_000,
  css: 25_000,
} as const;

export type Asset = { name: string; gzipBytes: number };

/**
 * Budget problems for built client assets. The entry is `index-*.js`; `utils-*.js` loads with it
 * on every page. Leaflet loads only when a map opens and must stay its own chunk.
 */
export function checkBudget(assets: Asset[]): string[] {
  const js = assets.filter((a) => a.name.endsWith('.js'));
  const css = assets.filter((a) => a.name.endsWith('.css') && !a.name.startsWith('leaflet'));
  const entry = js.find((a) => /^index-[\w-]+\.js$/.test(a.name));
  const utils = js.find((a) => /^utils-[\w-]+\.js$/.test(a.name));
  const errors: string[] = [];
  const kb = (n: number) => `${(n / 1000).toFixed(1)} kB`;
  if (!entry) return ['no entry chunk (index-*.js) found: build first'];
  if (entry.gzipBytes > BUDGET.entryJs)
    errors.push(`entry ${entry.name} is ${kb(entry.gzipBytes)} (budget ${kb(BUDGET.entryJs)})`);
  const first = entry.gzipBytes + (utils?.gzipBytes ?? 0);
  if (first > BUDGET.firstLoadJs)
    errors.push(`first-load JS is ${kb(first)} (budget ${kb(BUDGET.firstLoadJs)})`);
  for (const a of js)
    if (a !== entry && !a.name.startsWith('leaflet') && a.gzipBytes > BUDGET.chunkJs)
      errors.push(`chunk ${a.name} is ${kb(a.gzipBytes)} (budget ${kb(BUDGET.chunkJs)})`);
  if (!js.some((a) => a.name.startsWith('leaflet')))
    errors.push('leaflet is not its own chunk: the map must load only when opened');
  const cssTotal = css.reduce((n, a) => n + a.gzipBytes, 0);
  if (cssTotal > BUDGET.css) errors.push(`CSS is ${kb(cssTotal)} (budget ${kb(BUDGET.css)})`);
  return errors;
}
