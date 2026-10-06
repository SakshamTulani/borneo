import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

describe('loadEnv', () => {
  it('refuses demo mode in production', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', DEMO_MODE: 'true' })).toThrow(
      'DEMO_MODE=true is not allowed when NODE_ENV=production',
    );
  });

  it('allows demo mode outside production', () => {
    expect(loadEnv({ ...base, NODE_ENV: 'development', DEMO_MODE: 'true' }).DEMO_MODE).toBe(true);
  });
});

describe('loadEnv auth', () => {
  it('requires AUTH_SECRET in production', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      'AUTH_SECRET is required when NODE_ENV=production',
    );
    expect(
      loadEnv({ ...base, NODE_ENV: 'production', AUTH_SECRET: 's'.repeat(32) }).AUTH_SECRET,
    ).toBe('s'.repeat(32));
  });

  it('uses a development secret elsewhere', () => {
    expect(loadEnv(base).AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
  });
});
