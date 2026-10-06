import { describe, expect, it } from 'vitest';
import { resetDatabase } from './reset';

describe('db:reset', () => {
  it('refuses to run in production', async () => {
    await expect(resetDatabase('postgres://unused', new Date(), 'production')).rejects.toThrow(
      'db:reset is not allowed when NODE_ENV=production',
    );
  });

  it('refuses a non-local database', async () => {
    await expect(
      resetDatabase('postgres://u:p@db.example.com:5432/borneo', new Date(), 'development'),
    ).rejects.toThrow('db:reset only runs against a local database');
  });
});
