import { z } from 'zod';
import { getJson } from '../../../shared/lib/http';

export const healthDto = z.object({
  status: z.literal('ok'),
  demoMode: z.boolean(),
  database: z.enum(['up', 'down']),
});

export type HealthDto = z.infer<typeof healthDto>;

export function getHealth(): Promise<HealthDto> {
  return getJson('/health', healthDto);
}
