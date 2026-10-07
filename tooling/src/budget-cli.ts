import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { BUDGET, checkBudget } from './checks/budget.ts';

// `pnpm perf:budget`: builds the web app first (see package.json), then checks the client assets.
const dir = join(dirname(fileURLToPath(import.meta.url)), '../../apps/web/dist/client/assets');
const assets = readdirSync(dir)
  .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
  .map((name) => ({ name, gzipBytes: gzipSync(readFileSync(join(dir, name))).length }));
const errors = checkBudget(assets);
const top = [...assets].sort((a, b) => b.gzipBytes - a.gzipBytes).slice(0, 5);
for (const a of top) console.log(`${(a.gzipBytes / 1000).toFixed(1).padStart(7)} kB  ${a.name}`);
console.log(`budget: ${JSON.stringify(BUDGET)}`);
for (const e of errors) console.log(`✖ ${e}`);
console.log(errors.length ? '✖ over budget' : '✔ within budget');
process.exit(errors.length ? 1 : 0);
