import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireCustomerId, type SessionReader } from '../../session/index';
import {
  errorResponseSchema,
  noContent,
  notificationPageSchema,
  notificationParams,
  notificationsQuery,
} from './notifications.schema';
import type { NotificationsService } from './notifications.service';

export function notificationsRoutes(
  service: NotificationsService,
  session: SessionReader,
): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    r.get(
      '/me/notifications',
      {
        schema: {
          querystring: notificationsQuery,
          response: {
            200: notificationPageSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        void reply.header('cache-control', 'private, no-store');
        const { cursor, limit } = request.query;
        return service.list(customerId, { ...(cursor ? { cursor } : {}), limit });
      },
    );

    r.post(
      '/me/notifications/:id/read',
      {
        schema: {
          params: notificationParams,
          response: { 204: noContent, 401: errorResponseSchema, 404: errorResponseSchema },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        await service.markRead(customerId, request.params.id);
        return reply.status(204).send(null);
      },
    );

    r.post(
      '/me/notifications/read-all',
      { schema: { response: { 204: noContent, 401: errorResponseSchema } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        await service.markAllRead(customerId);
        return reply.status(204).send(null);
      },
    );
  };
}
