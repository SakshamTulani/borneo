import { describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { createCatalogService } from './modules/catalog/index';
import { createHealthService } from './modules/health/index';
import { createSearchService } from './modules/search/index';
import { emptyCatalogDeps, emptySearchDeps } from './test/factories';

const catalog = createCatalogService(emptyCatalogDeps());
const search = createSearchService(emptySearchDeps());

describe('GET /health', () => {
  it('reports status, demo mode and database state', async () => {
    const health = createHealthService({ demoMode: true, pingDatabase: async () => false });
    const app = buildApp({ health, catalog, search });

    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', demoMode: true, database: 'down' });
  });
});

describe('errors', () => {
  it('renders unknown routes in the standard error shape', async () => {
    const health = createHealthService({ demoMode: false, pingDatabase: async () => true });
    const res = await buildApp({ health, catalog, search }).inject({ method: 'GET', url: '/nope' });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'No route for GET /nope' } });
  });
});
