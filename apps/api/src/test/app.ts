import { buildApp, type AppDeps } from '../app';
import type { Db } from '../db/client';
import { appDeps } from '../services';
import { TEST_NOW } from './db';

export const TEST_ORIGIN = 'http://localhost:5173';

/** The real app on the seeded test database, clock pinned to TEST_NOW. Override any dependency. */
export function testApp(
  db: Db,
  over: Partial<AppDeps> & { demoMode?: boolean; now?: () => number } = {},
): ReturnType<typeof buildApp> {
  const { demoMode = false, now = () => TEST_NOW.getTime(), ...deps } = over;
  const silent = { info: () => {}, warn: () => {} };
  return buildApp({
    ...appDeps(db, {
      demoMode,
      auth: { secret: 'test-auth-secret-at-least-32-characters', baseURL: `${TEST_ORIGIN}/api` },
      webOrigin: TEST_ORIGIN,
      now,
      log: silent,
    }),
    ...deps,
  });
}
