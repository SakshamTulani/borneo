import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAdrs } from './checks/adr.ts';
import { checkBoundaryAnchors, type Anchor } from './checks/boundaryAnchors.ts';
import { checkHookFile } from './checks/hooks.ts';
import { checkRuleIds } from './checks/ruleIds.ts';
import { checkScoping } from './checks/scoping.ts';
import { listFiles, read } from './files.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const { anchors } = createRequire(import.meta.url)('../boundaries.cjs') as { anchors: Anchor[] };
const files = listFiles(root);
const code = files.filter((f) => /^(apps|packages)\/.+\.tsx?$/.test(f));

const adrFiles = files
  .filter((f) => /^docs\/adr\/[^/]+\.md$/.test(f))
  .map((f) => ({ name: f.split('/').pop()!, content: read(root, f) }));

const results: Record<string, string[]> = {
  adr: checkAdrs(adrFiles, read(root, 'docs/adr/README.md')),
  hooks: code.flatMap((f) => checkHookFile(f, read(root, f))),
  scoping: checkScoping(
    new Map(code.filter((f) => f.startsWith('apps/api/')).map((f) => [f, read(root, f)])),
  ),
  boundaries: checkBoundaryAnchors(anchors, files),
  'rule-ids': checkRuleIds(
    new Map(
      code.filter((f) => f.startsWith('packages/shared/src/rules/')).map((f) => [f, read(root, f)]),
    ),
    read(root, 'docs/DECISIONS.md'),
  ),
};

let failed = false;
for (const [name, errors] of Object.entries(results)) {
  console.log(`${errors.length ? '✖' : '✔'} ${name}`);
  for (const e of errors) console.log(`  ${e}`);
  failed ||= errors.length > 0;
}
process.exit(failed ? 1 : 0);
