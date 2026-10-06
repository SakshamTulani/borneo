import { buildApp } from './app';
import { createDb } from './db/client';
import { loadEnv } from './env';
import { startJobs } from './jobs/index';
import { appDeps } from './services';

const env = loadEnv(process.env);
const { db } = createDb(env.DATABASE_URL);

const background = await startJobs(env.DATABASE_URL);
const deps = appDeps(db, {
  demoMode: env.DEMO_MODE,
  auth: { secret: env.AUTH_SECRET, baseURL: `${env.WEB_ORIGIN}/api` },
  webOrigin: env.WEB_ORIGIN,
  trustProxy: env.TRUST_PROXY,
  jobs: background.jobs,
});
await background.work({
  expireHold: ({ customerId, orderId }) => deps.orders.expire(customerId, orderId),
  latePayment: ({ customerId, orderId, attemptId }) =>
    deps.orders.paymentSucceeded(customerId, orderId, attemptId),
});
const app = buildApp(deps);
app.addHook('onClose', () => background.stop());

await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
