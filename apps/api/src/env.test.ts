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
