import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireCustomerId, type SessionReader } from '../../session/index';
import { accountSummarySchema, errors, ownedDevicesSchema } from './account.schema';
import type { AccountService } from './account.service';

export function accountRoutes(service: AccountService, session: SessionReader): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    r.get(
      '/me/summary',
      { schema: { response: { 200: accountSummarySchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        void reply.header('cache-control', 'private, no-store');
        return service.summary(customerId);
      },
    );

    r.get(
      '/me/devices',
      { schema: { response: { 200: ownedDevicesSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        void reply.header('cache-control', 'private, no-store');
        return service.devices(customerId);
      },
    );
  };
}
