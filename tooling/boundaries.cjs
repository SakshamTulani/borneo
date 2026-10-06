// Single source of boundary paths. Used by .dependency-cruiser.cjs (rules)
// and tooling/src/checks/boundaryAnchors.ts (every anchor must match a real file).

const FEATURE = '^apps/web/src/features/';
const MODULE = '^apps/api/src/modules/';

// Lowest to highest. A layer may only import layers below it (ADR-0007).
const WEB_LAYERS = [
  ['model', 'model\\.ts$'],
  ['api', 'api/'],
  ['mappers', 'mappers/'],
  ['repository', 'repository/'],
  ['hooks', 'hooks/'],
  ['ui', 'ui/'],
];
const WEB_INDEX = 'index\\.ts$';

const API_LAYERS = {
  route: '[^/]+\\.route\\.ts$',
  service: '[^/]+\\.service\\.ts$',
  repository: '[^/]+\\.repository\\.ts$',
  schema: '[^/]+\\.schema\\.ts$',
  index: 'index\\.ts$',
};

const PATHS = {
  webSrc: '^apps/web/src/',
  webRoutes: '^apps/web/src/routes/',
  webShared: '^apps/web/src/shared/',
  webHttp: '^apps/web/src/shared/lib/http\\.ts$',
  webRouter: '^apps/web/src/router\\.tsx$',
  apiDb: '^apps/api/src/db/',
  apiSession: '^apps/api/src/session/',
  shared: '^packages/shared/src/',
};

/** Every pattern here must match at least one real file. */
const anchors = [
  ...WEB_LAYERS.map(([name, p]) => ({
    name: `web feature ${name}`,
    pattern: `${FEATURE}[^/]+/${p}`,
  })),
  { name: 'web feature index', pattern: `${FEATURE}[^/]+/${WEB_INDEX}` },
  ...Object.entries(API_LAYERS).map(([name, p]) => ({
    name: `api module ${name}`,
    pattern: `${MODULE}[^/]+/${p}`,
  })),
  ...Object.entries(PATHS).map(([name, pattern]) => ({ name, pattern })),
];

module.exports = { FEATURE, MODULE, WEB_LAYERS, WEB_INDEX, API_LAYERS, PATHS, anchors };
