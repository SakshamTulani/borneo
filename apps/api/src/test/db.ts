import { afterAll, inject } from 'vitest';
import { createDb } from '../db/client';

/** The clock the test database was seeded with (flash sales and offers are relative to it). */
export const TEST_NOW = new Date('2026-10-06T06:30:00.000Z');

/** The seeded test database (see globalSetup.ts); closed after the file's tests. */
export function useTestDb() {
  const { db, close } = createDb(inject('databaseUrl'));
  afterAll(close);
  return db;
}
