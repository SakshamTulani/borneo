import { buildApp } from './app';
import { createDb } from './db/client';
import { loadEnv } from './env';
import { createHealthService, pingDatabase } from './modules/health/index';
import { catalogService, deliveryService, searchService } from './services';

const env = loadEnv(process.env);
const { db } = createDb(env.DATABASE_URL);

const catalog = catalogService(db);
const app = buildApp({
  health: createHealthService({ demoMode: env.DEMO_MODE, pingDatabase: () => pingDatabase(db) }),
  catalog,
  search: searchService(db, catalog),
  delivery: deliveryService(db),
});

await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
