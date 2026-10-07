import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireCustomerId, type SessionReader } from '../../session/index';
import { errors, slugParams, upgradeForProductSchema, upgradeStripSchema } from './upgrade.schema';
import type { UpgradeService } from './upgrade.service';

export function upgradeRoutes(service: UpgradeService, session: SessionReader): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    r.get(
      '/me/upgrades',
      { schema: { response: { 200: upgradeStripSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        void reply.header('cache-control', 'private, no-store');
        return service.strip(customerId);
      },
    );

    r.get(
      '/me/upgrades/:slug',
      { schema: { params: slugParams, response: { 200: upgradeForProductSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        void reply.header('cache-control', 'private, no-store');
        return service.forProduct(customerId, request.params.slug);
      },
    );
  };
}
