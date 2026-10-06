import { z } from 'zod';

export const healthResponse = z.object({
  status: z.literal('ok'),
  demoMode: z.boolean(),
  database: z.enum(['up', 'down']),
});

export type HealthResponse = z.infer<typeof healthResponse>;
