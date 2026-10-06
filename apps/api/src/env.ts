import { z } from 'zod';

/** Development only; production must set its own AUTH_SECRET. */
const DEV_AUTH_SECRET = 'borneo-dev-auth-secret-never-use-in-production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  API_PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().url(),
  /** Signs session cookies (Better Auth). At least 32 characters. */
  AUTH_SECRET: z.string().min(32).optional(),
  /** The web app's origin: the API is served to browsers at `<WEB_ORIGIN>/api`. */
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  /**
   * Addresses of the proxies in front of the API (the web server), comma separated. Their
   * X-Forwarded-For gives the real client IP for rate limits (D-190). Never "true".
   */
  TRUST_PROXY: z.string().default('127.0.0.1,::1,::ffff:127.0.0.1'),
});

export type Env = Omit<z.infer<typeof envSchema>, 'AUTH_SECRET'> & { AUTH_SECRET: string };

/** Parses env; refuses demo mode (D-165) and a missing auth secret in production. */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const env = envSchema.parse(source);
  if (env.NODE_ENV === 'production' && env.DEMO_MODE) {
    throw new Error('DEMO_MODE=true is not allowed when NODE_ENV=production');
  }
  if (env.NODE_ENV === 'production' && !env.AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required when NODE_ENV=production');
  }
  return { ...env, AUTH_SECRET: env.AUTH_SECRET ?? DEV_AUTH_SECRET };
}
