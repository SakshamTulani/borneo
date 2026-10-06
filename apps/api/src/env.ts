import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  API_PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

/** Parses env and refuses demo mode in production (D-165). */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const env = envSchema.parse(source);
  if (env.NODE_ENV === 'production' && env.DEMO_MODE) {
    throw new Error('DEMO_MODE=true is not allowed when NODE_ENV=production');
  }
  return env;
}
