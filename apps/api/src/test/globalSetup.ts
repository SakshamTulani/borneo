import { fileURLToPath } from 'node:url';
import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { resetDatabase } from '../reset';
import { TEST_NOW } from './db';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    ordersDatabaseUrl: string;
  }
}

/** Recreates `<db>_test`, migrates and seeds it once per run. Repository and route tests read it. */
export default async function setup(project: TestProject) {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../../../../.env', import.meta.url)));
  } catch {
    // No .env: fall back to the docker-compose defaults.
  }
  const base = process.env.DATABASE_URL ?? 'postgres://borneo:borneo@localhost:5432/borneo';
  const url = new URL(process.env.TEST_DATABASE_URL ?? base);
  if (!process.env.TEST_DATABASE_URL) url.pathname = `${url.pathname}_test`;
  const name = url.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(name))
    throw new Error(`Test database name must end in _test: ${name}`);

  const ordersName = name.replace(/_test$/, '_orders_test');
  const admin = new pg.Client({ connectionString: base });
  try {
    await admin.connect();
  } catch (cause) {
    throw new Error('Postgres is not reachable. Run "docker compose up -d".', { cause });
  }
  try {
    await admin.query(`drop database if exists "${ordersName}" with (force)`);
    await admin.query(`drop database if exists "${name}" with (force)`);
    await admin.query(`create database "${name}"`);
    await resetDatabase(url.toString(), TEST_NOW, 'test');
    // Suites that add catalog rows (orders: products with known stock) write to a copy, so
    // suites that list the whole catalog never see them (taken before any test connects).
    await admin.query(`create database "${ordersName}" template "${name}"`);
  } finally {
    await admin.end();
  }

  const ordersUrl = new URL(url);
  ordersUrl.pathname = `/${ordersName}`;
  project.provide('databaseUrl', url.toString());
  project.provide('ordersDatabaseUrl', ordersUrl.toString());
}
