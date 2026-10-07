import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireCustomerId, type SessionReader } from '../../session/index';
import {
  accountPageQuerySchema,
  errors,
  wishlistPageSchema,
  wishlistParamsSchema,
  wishlistSlugsSchema,
} from './wishlist.schema';
import type { WishlistService } from './wishlist.service';

const noStore = (reply: FastifyReply) => void reply.header('cache-control', 'private, no-store');

export function wishlistRoutes(
  service: WishlistService,
  session: SessionReader,
): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    r.get(
      '/me/wishlist',
      {
        schema: {
          querystring: accountPageQuerySchema,
          response: { 200: wishlistPageSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.list(customerId, request.query);
      },
    );

    r.get(
      '/me/wishlist/slugs',
      { schema: { response: { 200: wishlistSlugsSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.slugs(customerId);
      },
    );

    r.put(
      '/me/wishlist/:slug',
      {
        schema: { params: wishlistParamsSchema, response: { 200: wishlistSlugsSchema, ...errors } },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.add(customerId, request.params.slug);
      },
    );

    r.delete(
      '/me/wishlist/:slug',
      {
        schema: { params: wishlistParamsSchema, response: { 200: wishlistSlugsSchema, ...errors } },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.remove(customerId, request.params.slug);
      },
    );
  };
}
