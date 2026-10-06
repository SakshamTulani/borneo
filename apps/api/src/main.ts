import { buildApp } from './app';
import { createDb } from './db/client';
import { loadEnv } from './env';
import { appDeps } from './services';

const env = loadEnv(process.env);
const { db } = createDb(env.DATABASE_URL);

const app = buildApp(
  appDeps(db, {
    demoMode: env.DEMO_MODE,
    auth: { secret: env.AUTH_SECRET, baseURL: `${env.WEB_ORIGIN}/api` },
    webOrigin: env.WEB_ORIGIN,
    trustProxy: env.TRUST_PROXY,
  }),
);

await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
