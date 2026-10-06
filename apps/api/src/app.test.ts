import { describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { createHealthService } from './modules/health/index';

describe('GET /health', () => {
  it('reports status, demo mode and database state', async () => {
    const health = createHealthService({ demoMode: true, pingDatabase: async () => false });
    const app = buildApp({ health });

    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', demoMode: true, database: 'down' });
  });
});
