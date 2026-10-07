import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireCustomerId, type SessionReader } from '../../session/index';
import { errors, watchListSchema, watchParamsSchema } from './watch.schema';
import type { WatchService } from './watch.service';

const noStore = (reply: FastifyReply) => void reply.header('cache-control', 'private, no-store');

export function watchRoutes(service: WatchService, session: SessionReader): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    r.get(
      '/me/watch',
      { schema: { response: { 200: watchListSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.list(customerId);
      },
    );

    r.put(
      '/me/watch/:sku',
      { schema: { params: watchParamsSchema, response: { 200: watchListSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.add(customerId, request.params.sku);
      },
    );

    r.delete(
      '/me/watch/:sku',
      { schema: { params: watchParamsSchema, response: { 200: watchListSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.remove(customerId, request.params.sku);
      },
    );
  };
}
