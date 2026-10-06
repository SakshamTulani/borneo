import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { healthResponse } from './health.schema';
import type { HealthService } from './health.service';

export function healthRoutes(service: HealthService): FastifyPluginAsync {
  return async (app) => {
    app
      .withTypeProvider<ZodTypeProvider>()
      .get('/health', { schema: { response: { 200: healthResponse } } }, () => service.getHealth());
  };
}
