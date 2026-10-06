import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Plants each boundary violation in a tiny fake repo, runs the real depcruise CLI with the
// real config (same path as `pnpm check`), and expects exactly that error.
const require = createRequire(import.meta.url);
const configPath = resolve(import.meta.dirname, '../../.dependency-cruiser.cjs');
const config = require(configPath);
const bin = resolve(
  import.meta.dirname,
  '../../node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
);

const W = 'apps/web/src';
const F = `${W}/features`;
const M = 'apps/api/src/modules';

const baseline: Record<string, string> = {
  // Mirrors tsconfig.depcruise.json: the web `@/` alias.
  ['tsconfig.depcruise.json']: JSON.stringify({
    compilerOptions: { paths: { '@/*': ['./apps/web/src/*'] } },
    include: ['apps/web/src'],
  }),
  [`${W}/shared/lib/http.ts`]: 'export const getJson = () => 1;',
  [`${W}/shared/ui/Shell.tsx`]: 'export const Shell = 1;',
  [`${F}/alpha/model.ts`]: 'export const model = 1;',
  [`${F}/alpha/api/getAlpha.ts`]:
    "import { getJson } from '../../../shared/lib/http';\nexport const getAlpha = getJson;",
  [`${F}/alpha/mappers/toAlpha.ts`]:
    "import { getAlpha } from '../api/getAlpha';\nimport { model } from '../model';\nexport const toAlpha = [getAlpha, model];",
  [`${F}/alpha/repository/alphaRepository.ts`]:
    "import { getAlpha } from '../api/getAlpha';\nimport { toAlpha } from '../mappers/toAlpha';\nexport const repo = [getAlpha, toAlpha];",
  [`${F}/alpha/hooks/useAlphaQuery.ts`]:
    "import { repo } from '../repository/alphaRepository';\nexport const useAlphaQuery = () => repo;",
  [`${F}/alpha/ui/Alpha.tsx`]:
    "import { useAlphaQuery } from '../hooks/useAlphaQuery';\nimport { Shell } from '../../../shared/ui/Shell';\nexport const Alpha = [useAlphaQuery, Shell];",
  [`${F}/alpha/index.ts`]: "export { Alpha } from './ui/Alpha';",
  [`${F}/beta/ui/Beta.tsx`]:
    "import { Alpha } from '../../alpha/index';\nexport const Beta = Alpha;",
  [`${F}/beta/index.ts`]: "export { Beta } from './ui/Beta';",
  [`${W}/routes/index.tsx`]:
    "import { Alpha } from '../features/alpha/index';\nexport const Route = Alpha;",
  ['apps/api/src/db/client.ts']: 'export const db = 1;',
  ['apps/api/src/session/index.ts']: 'export const requireCustomerId = () => 1;',
  [`${M}/orders/orders.schema.ts`]: 'export const schema = 1;',
  [`${M}/orders/orders.repository.ts`]:
    "import { db } from '../../db/client';\nexport const repo = db;",
  [`${M}/orders/orders.service.ts`]:
    "import { repo } from './orders.repository';\nimport { schema } from './orders.schema';\nimport { billing } from '../billing/index';\nexport const service = [repo, schema, billing];",
  [`${M}/orders/orders.route.ts`]:
    "import { service } from './orders.service';\nimport { requireCustomerId } from '../../session/index';\nexport const route = [service, requireCustomerId];",
  [`${M}/orders/index.ts`]: "export { route } from './orders.route';",
  [`${M}/billing/billing.service.ts`]: 'export const billingService = 1;',
  [`${M}/billing/index.ts`]: "export { billingService as billing } from './billing.service';",
  ['packages/shared/src/index.ts']: 'export const shared = 1;',
  ['node_modules/react/package.json']: '{ "name": "react", "main": "index.js" }',
  ['node_modules/react/index.js']: 'module.exports = {};',
};

async function violations(planted: Record<string, string>): Promise<string[]> {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'borneo-canary-')));
  try {
    for (const [path, content] of Object.entries({ ...baseline, ...planted })) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
    let out: string;
    try {
      out = execFileSync('node', [bin, 'apps', 'packages', '--config', configPath, '-T', 'json'], {
        cwd: dir,
        encoding: 'utf8',
      });
    } catch (error) {
      out = (error as { stdout: string }).stdout; // exits non-zero when it finds violations
    }
    const output = JSON.parse(out) as {
      summary: { violations: { rule: { name: string }; from: string; to: string }[] };
    };
    return output.summary.violations.map((v) => `${v.rule.name}: ${v.from} → ${v.to}`).sort();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const imp = (target: string) => `import { x } from '${target}';\nexport const y = x;`;
const leaf = 'export const x = 1;';

const cases: [string, Record<string, string>, string[]][] = [
  [
    'web-upward-from-model',
    { [`${F}/alpha/model.ts`]: imp('./ui/Planted'), [`${F}/alpha/ui/Planted.tsx`]: leaf },
    [`web-upward-from-model: ${F}/alpha/model.ts → ${F}/alpha/ui/Planted.tsx`],
  ],
  [
    'web-upward-from-api',
    {
      [`${F}/alpha/api/planted.ts`]: imp('../hooks/usePlantedQuery'),
      [`${F}/alpha/hooks/usePlantedQuery.ts`]: leaf,
    },
    [`web-upward-from-api: ${F}/alpha/api/planted.ts → ${F}/alpha/hooks/usePlantedQuery.ts`],
  ],
  [
    'web-upward-from-mappers',
    {
      [`${F}/alpha/mappers/planted.ts`]: imp('../repository/planted'),
      [`${F}/alpha/repository/planted.ts`]: leaf,
    },
    [`web-upward-from-mappers: ${F}/alpha/mappers/planted.ts → ${F}/alpha/repository/planted.ts`],
  ],
  [
    'web-upward-from-repository',
    {
      [`${F}/alpha/repository/planted.ts`]: imp('../hooks/usePlantedQuery'),
      [`${F}/alpha/hooks/usePlantedQuery.ts`]: leaf,
    },
    [
      `web-upward-from-repository: ${F}/alpha/repository/planted.ts → ${F}/alpha/hooks/usePlantedQuery.ts`,
    ],
  ],
  [
    'web-upward-from-hooks',
    {
      [`${F}/alpha/hooks/usePlantedResult.ts`]: imp('../ui/Planted'),
      [`${F}/alpha/ui/Planted.tsx`]: leaf,
    },
    [`web-upward-from-hooks: ${F}/alpha/hooks/usePlantedResult.ts → ${F}/alpha/ui/Planted.tsx`],
  ],
  [
    'web-upward-from-ui',
    { [`${F}/alpha/ui/Planted.tsx`]: imp('../index') },
    [`web-upward-from-ui: ${F}/alpha/ui/Planted.tsx → ${F}/alpha/index.ts`],
  ],
  [
    'web-cross-feature-deep-import',
    { [`${F}/alpha/ui/Planted.tsx`]: imp('../../beta/ui/Beta') },
    [`web-cross-feature-deep-import: ${F}/alpha/ui/Planted.tsx → ${F}/beta/ui/Beta.tsx`],
  ],
  [
    'web-deep-import-into-feature',
    { [`${W}/routes/planted.tsx`]: imp('../features/beta/ui/Beta') },
    [`web-deep-import-into-feature: ${W}/routes/planted.tsx → ${F}/beta/ui/Beta.tsx`],
  ],
  [
    'web-feature-imports-routes',
    { [`${F}/alpha/ui/Planted.tsx`]: imp('../../../routes/index') },
    [`web-feature-imports-routes: ${F}/alpha/ui/Planted.tsx → ${W}/routes/index.tsx`],
  ],
  [
    'web-shared-imports-feature',
    { [`${W}/shared/ui/Planted.tsx`]: imp('../../features/beta/index') },
    [`web-shared-imports-feature: ${W}/shared/ui/Planted.tsx → ${F}/beta/index.ts`],
  ],
  [
    'web-http-outside-api-layer',
    { [`${F}/alpha/repository/planted.ts`]: imp('../../../shared/lib/http') },
    [`web-http-outside-api-layer: ${F}/alpha/repository/planted.ts → ${W}/shared/lib/http.ts`],
  ],
  [
    'api-route-skips-service',
    { [`${M}/orders/planted.route.ts`]: imp('./orders.repository') },
    [`api-route-skips-service: ${M}/orders/planted.route.ts → ${M}/orders/orders.repository.ts`],
  ],
  [
    'api-service-imports-route',
    { [`${M}/orders/planted.service.ts`]: imp('./orders.route') },
    [`api-service-imports-route: ${M}/orders/planted.service.ts → ${M}/orders/orders.route.ts`],
  ],
  [
    'api-repository-imports-upward',
    { [`${M}/orders/planted.repository.ts`]: imp('./orders.service') },
    [
      `api-repository-imports-upward: ${M}/orders/planted.repository.ts → ${M}/orders/orders.service.ts`,
    ],
  ],
  [
    'api-schema-imports-layer',
    { [`${M}/orders/planted.schema.ts`]: imp('./orders.repository') },
    [`api-schema-imports-layer: ${M}/orders/planted.schema.ts → ${M}/orders/orders.repository.ts`],
  ],
  [
    'api-db-outside-repository',
    { [`${M}/orders/planted.service.ts`]: imp('../../db/client') },
    [`api-db-outside-repository: ${M}/orders/planted.service.ts → apps/api/src/db/client.ts`],
  ],
  [
    'api-cross-module-deep-import',
    { [`${M}/orders/planted.service.ts`]: imp('../billing/billing.service') },
    [
      `api-cross-module-deep-import: ${M}/orders/planted.service.ts → ${M}/billing/billing.service.ts`,
    ],
  ],
  [
    'api-session-in-data-layer (repository)',
    { [`${M}/orders/planted.repository.ts`]: imp('../../session/index') },
    [
      `api-session-in-data-layer: ${M}/orders/planted.repository.ts → apps/api/src/session/index.ts`,
    ],
  ],
  [
    'api-session-in-data-layer (service)',
    { [`${M}/orders/planted.service.ts`]: imp('../../session/index') },
    [`api-session-in-data-layer: ${M}/orders/planted.service.ts → apps/api/src/session/index.ts`],
  ],
  [
    'web-imports-api-app',
    { [`${W}/shared/lib/planted.ts`]: imp('../../../../api/src/db/client') },
    [`web-imports-api-app: ${W}/shared/lib/planted.ts → apps/api/src/db/client.ts`],
  ],
  [
    'api-imports-web-app',
    { ['apps/api/src/planted.ts']: imp('../../web/src/shared/ui/Shell') },
    [`api-imports-web-app: apps/api/src/planted.ts → ${W}/shared/ui/Shell.tsx`],
  ],
  [
    'shared-imports-app',
    { ['packages/shared/src/planted.ts']: imp('../../../apps/api/src/db/client') },
    ['shared-imports-app: packages/shared/src/planted.ts → apps/api/src/db/client.ts'],
  ],
  [
    'shared-imports-framework',
    { ['packages/shared/src/planted.ts']: imp('react') },
    ['shared-imports-framework: packages/shared/src/planted.ts → node_modules/react/index.js'],
  ],
  [
    'no-unresolvable',
    { [`${F}/alpha/ui/Planted.tsx`]: imp('./DoesNotExist') },
    [`no-unresolvable: ${F}/alpha/ui/Planted.tsx → ./DoesNotExist`],
  ],
  [
    'web-upward-from-repository (via @/ alias)',
    {
      [`${F}/alpha/repository/planted.ts`]: imp('@/features/alpha/ui/Planted'),
      [`${F}/alpha/ui/Planted.tsx`]: leaf,
    },
    [`web-upward-from-repository: ${F}/alpha/repository/planted.ts → ${F}/alpha/ui/Planted.tsx`],
  ],
  // depcruise reports one edge per cycle
  [
    'no-circular',
    {
      [`${F}/alpha/ui/CycleA.tsx`]: imp('./CycleB'),
      [`${F}/alpha/ui/CycleB.tsx`]: imp('./CycleA'),
    },
    [`no-circular: ${F}/alpha/ui/CycleA.tsx → ${F}/alpha/ui/CycleB.tsx`],
  ],
];

describe('dependency-cruiser boundaries (canary)', () => {
  it('baseline layout has no violations', async () => {
    expect(await violations({})).toEqual([]);
  });

  it('every rule has a canary', () => {
    const covered = new Set(
      cases.flatMap(([, , expected]) => expected.map((e) => e.split(':')[0])),
    );
    expect(
      config.forbidden.map((r: { name: string }) => r.name).filter((n: string) => !covered.has(n)),
    ).toEqual([]);
  });

  it.each(cases)('%s', async (_name, planted, expected) => {
    expect(await violations(planted)).toEqual(expected);
  });
});
