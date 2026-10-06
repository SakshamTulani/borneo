// Boundary rules (ADR-0007, ADR-0005). Rule names are asserted by tooling canary tests.
const {
  FEATURE,
  MODULE,
  WEB_LAYERS,
  WEB_INDEX,
  API_LAYERS: L,
  PATHS: P,
} = require('./tooling/boundaries.cjs');

const webUpward = WEB_LAYERS.map(([name, from], i) => {
  const higher = WEB_LAYERS.slice(i + 1).map(([, p]) => p);
  return {
    name: `web-upward-from-${name}`,
    comment: `features/*/${name} may only import lower layers (model < api < mappers < repository < hooks < ui)`,
    severity: 'error',
    from: { path: `${FEATURE}([^/]+)/${from}` },
    to: { path: `${FEATURE}$1/(${[...higher, WEB_INDEX].join('|')})` },
  };
});

module.exports = {
  forbidden: [
    ...webUpward,
    {
      name: 'web-cross-feature-deep-import',
      comment: 'Import another feature only via its index.ts',
      severity: 'error',
      from: { path: `${FEATURE}([^/]+)/` },
      to: { path: FEATURE, pathNot: [`${FEATURE}$1/`, `${FEATURE}[^/]+/${WEB_INDEX}`] },
    },
    {
      name: 'web-deep-import-into-feature',
      comment: 'Routes and shared code use a feature only via its index.ts',
      severity: 'error',
      from: { path: P.webSrc, pathNot: FEATURE },
      to: { path: `${FEATURE}[^/]+/`, pathNot: `${FEATURE}[^/]+/${WEB_INDEX}` },
    },
    {
      name: 'web-feature-imports-routes',
      comment: 'Features never import routes or the router',
      severity: 'error',
      from: { path: FEATURE },
      to: { path: [P.webRoutes, P.webRouter] },
    },
    {
      name: 'web-shared-imports-feature',
      comment: 'shared/ is below features and routes',
      severity: 'error',
      from: { path: P.webShared },
      to: { path: [FEATURE, P.webRoutes] },
    },
    {
      name: 'web-http-outside-api-layer',
      comment: 'Only features/*/api/ does raw HTTP',
      severity: 'error',
      from: { path: P.webSrc, pathNot: [`${FEATURE}[^/]+/api/`, P.webHttp] },
      to: { path: P.webHttp },
    },
    {
      name: 'api-route-skips-service',
      comment: 'Routes call services, never repositories or db',
      severity: 'error',
      from: { path: `${MODULE}[^/]+/${L.route}` },
      to: { path: [`\\.repository\\.ts$`, P.apiDb] },
    },
    {
      name: 'api-service-imports-route',
      comment: 'Services sit below routes',
      severity: 'error',
      from: { path: `${MODULE}[^/]+/${L.service}` },
      to: { path: '\\.route\\.ts$' },
    },
    {
      name: 'api-repository-imports-upward',
      comment: 'Repositories sit below services and routes',
      severity: 'error',
      from: { path: `${MODULE}[^/]+/${L.repository}` },
      to: { path: '\\.(service|route)\\.ts$' },
    },
    {
      name: 'api-schema-imports-layer',
      comment: 'Schemas are leaf files',
      severity: 'error',
      from: { path: `${MODULE}[^/]+/${L.schema}` },
      to: { path: '\\.(route|service|repository)\\.ts$' },
    },
    {
      name: 'api-db-outside-repository',
      comment: 'Only repositories touch db/',
      severity: 'error',
      from: { path: MODULE, pathNot: ['\\.repository\\.ts$', '\\.test\\.ts$'] },
      to: { path: P.apiDb },
    },
    {
      name: 'api-cross-module-deep-import',
      comment: 'Import another module only via its index.ts',
      severity: 'error',
      from: { path: `${MODULE}([^/]+)/` },
      to: { path: MODULE, pathNot: [`${MODULE}$1/`, `${MODULE}[^/]+/${L.index}`] },
    },
    {
      name: 'api-session-in-data-layer',
      comment: 'Services and repositories take customerId as a param; only routes read the session',
      severity: 'error',
      from: { path: '^apps/api/src/.+\\.(repository|service)\\.ts$' },
      to: { path: P.apiSession },
    },
    {
      name: 'web-imports-api-app',
      severity: 'error',
      from: { path: '^apps/web/' },
      to: { path: '^apps/api/' },
    },
    {
      name: 'api-imports-web-app',
      severity: 'error',
      from: { path: '^apps/api/' },
      to: { path: '^apps/web/' },
    },
    {
      name: 'shared-imports-app',
      comment: 'packages/shared is the bottom layer',
      severity: 'error',
      from: { path: '^packages/shared/' },
      to: { path: '^apps/' },
    },
    {
      name: 'shared-imports-framework',
      comment: 'packages/shared stays pure: no React, Fastify, DB, Node I/O',
      severity: 'error',
      from: { path: '^packages/shared/' },
      to: {
        path: [
          'node_modules/(react|react-dom|fastify|drizzle-orm|pg)/',
          '^(fs|node:fs|http|node:http)$',
        ],
      },
    },
    {
      name: 'no-unresolvable',
      comment:
        'Every import must resolve (catches broken aliases that would hide imports from the rules above)',
      severity: 'error',
      from: { path: '^(apps|packages)/' },
      to: { couldNotResolve: true, pathNot: ['\\?url$'] },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['routeTree\\.gen\\.ts$', '\\.output/', 'dist/'] },
    tsPreCompilationDeps: true,
    // Resolves the web `@/` alias (tsconfig.depcruise.json mirrors apps/web paths).
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
