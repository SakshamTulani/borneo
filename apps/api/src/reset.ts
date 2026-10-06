import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb } from './db/client';
import { seedDatabase } from './db/seed/index';
import { relationsService } from './services';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Drops everything, applies every migration, loads the seed catalog and materialises relations.
 * Destructive: refuses production and any non-local database.
 */
export async function resetDatabase(
  databaseUrl: string,
  now: Date,
  nodeEnv = process.env.NODE_ENV,
) {
  if (nodeEnv === 'production') throw new Error('db:reset is not allowed when NODE_ENV=production');
  if (!LOCAL_HOSTS.has(new URL(databaseUrl).hostname))
    throw new Error('db:reset only runs against a local database');
  const { db, close } = createDb(databaseUrl);
  try {
    await db.execute(sql`drop schema if exists drizzle cascade`);
    // Jobs refer to orders that are about to go (pg-boss recreates its schema on start).
    await db.execute(sql`drop schema if exists pgboss cascade`);
    await db.execute(sql`drop schema if exists public cascade`);
    await db.execute(sql`create schema public`);
    await migrate(db, { migrationsFolder });
    await seedDatabase(db, now);
    const { edges, conflicts } = await relationsService(db).materialize();
    if (conflicts.length > 0)
      throw new Error(`Relation override conflicts: ${JSON.stringify(conflicts)}`);
    return { edges };
  } finally {
    await close();
  }
}
