import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { RateLimiter } from '../../plugins/rateLimit';
import { analyticsBatchSchema, errors, noContent } from './analytics.schema';
import type { AnalyticsService } from './analytics.service';

/** 60 events a minute per client IP (D-236). */
const EVENTS_PER_MINUTE = 60;

export function analyticsRoutes(
  service: AnalyticsService,
  limiter: RateLimiter,
): FastifyPluginAsync {
  return async (app) => {
    app
      .withTypeProvider<ZodTypeProvider>()
      .post(
        '/events',
        { schema: { body: analyticsBatchSchema, response: { 204: noContent, ...errors } } },
        async (request, reply) => {
          for (let i = 0; i < request.body.events.length; i++)
            limiter.hit(`events:${request.ip}`, { max: EVENTS_PER_MINUTE, windowMs: 60_000 });
          service.record(request.body);
          return reply.status(204).send(null);
        },
      );
  };
}
