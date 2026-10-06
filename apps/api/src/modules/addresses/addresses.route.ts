import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireCustomerId, type SessionReader } from '../../session/index';
import {
  addressInputSchema,
  addressListSchema,
  addressParams,
  addressSchema,
  errorResponseSchema,
  noContent,
} from './addresses.schema';
import type { AddressesService } from './addresses.service';

const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  404: errorResponseSchema,
  422: errorResponseSchema,
};

export function addressesRoutes(
  service: AddressesService,
  session: SessionReader,
): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    r.get(
      '/me/addresses',
      { schema: { response: { 200: addressListSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        void reply.header('cache-control', 'private, no-store');
        return { items: await service.list(customerId) };
      },
    );

    r.post(
      '/me/addresses',
      { schema: { body: addressInputSchema, response: { 201: addressSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        return reply.status(201).send(await service.create(customerId, request.body));
      },
    );

    r.put(
      '/me/addresses/:id',
      {
        schema: {
          params: addressParams,
          body: addressInputSchema,
          response: { 200: addressSchema, ...errors },
        },
      },
      async (request) => {
        const customerId = await requireCustomerId(session, request);
        return service.update(customerId, request.params.id, request.body);
      },
    );

    r.post(
      '/me/addresses/:id/default',
      { schema: { params: addressParams, response: { 204: noContent, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        await service.setDefault(customerId, request.params.id);
        return reply.status(204).send(null);
      },
    );

    r.delete(
      '/me/addresses/:id',
      { schema: { params: addressParams, response: { 204: noContent, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        await service.remove(customerId, request.params.id);
        return reply.status(204).send(null);
      },
    );
  };
}
