import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireCustomerId, type SessionReader } from '../../session/index';
import {
  errors,
  imageResponse,
  itemParams,
  photoParams,
  RETURN_BODY_LIMIT,
  returnPageSchema,
  returnParams,
  returnRequestInputSchema,
  returnRequestViewSchema,
} from './returns.schema';
import type { ReturnsService } from './returns.service';

const noStore = (reply: FastifyReply) => void reply.header('cache-control', 'private, no-store');

export function returnsRoutes(service: ReturnsService, session: SessionReader): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    r.post(
      '/me/orders/:orderId/items/:itemId/returns',
      {
        bodyLimit: RETURN_BODY_LIMIT,
        schema: {
          params: itemParams,
          body: returnRequestInputSchema,
          response: { 201: returnRequestViewSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        const created = await service.request(
          customerId,
          request.params.orderId,
          request.params.itemId,
          request.body,
        );
        return reply.status(201).send(created);
      },
    );

    r.get(
      '/me/returns',
      { schema: { response: { 200: returnPageSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.list(customerId);
      },
    );

    r.get(
      '/me/returns/:id/photos/:photoId',
      { schema: { params: photoParams, response: { 200: imageResponse, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        const photo = await service.photo(customerId, request.params.id, request.params.photoId);
        noStore(reply);
        return reply
          .type(photo.contentType)
          .header('x-content-type-options', 'nosniff')
          .send(photo.bytes);
      },
    );

    // Demo only (404 otherwise): the demo support desk (D-219).
    r.post(
      '/me/returns/:id/demo/advance',
      { schema: { params: returnParams, response: { 200: returnRequestViewSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.demoAdvance(customerId, request.params.id);
      },
    );
  };
}
