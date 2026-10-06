import { describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { createHealthService } from './modules/health/index';
import { fakeAppDeps } from './test/factories';

describe('GET /health', () => {
  it('reports status, demo mode and database state', async () => {
    const health = createHealthService({ demoMode: true, pingDatabase: async () => false });
    const app = buildApp(fakeAppDeps({ health }));

    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', demoMode: true, database: 'down' });
  });
});

describe('errors', () => {
  it('renders unknown routes in the standard error shape', async () => {
    const res = await buildApp(fakeAppDeps()).inject({
      method: 'GET',
      url: '/nope',
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'No route for GET /nope' } });
  });
});

describe('origin guard', () => {
  it('refuses writes from another site', async () => {
    const app = buildApp(fakeAppDeps());
    const post = (origin?: string) =>
      app.inject({
        method: 'POST',
        url: '/auth/sign-out',
        headers: origin ? { origin } : {},
      });

    const foreign = await post('https://evil.example');
    expect(foreign.statusCode).toBe(403);
    expect(foreign.json().error.code).toBe('FORBIDDEN_ORIGIN');
    expect((await post('http://localhost:5173')).statusCode).toBe(204);
    // Server-to-server calls (SSR) send no Origin.
    expect((await post()).statusCode).toBe(204);
  });

  it('lets reads through from anywhere', async () => {
    const res = await buildApp(fakeAppDeps()).inject({
      method: 'GET',
      url: '/session',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ customer: null });
  });
});
