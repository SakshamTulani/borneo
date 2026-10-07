import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireCustomerId, type SessionReader } from '../../session/index';
import {
  accountPageQuerySchema,
  errors,
  myReviewsSchema,
  reviewInputSchema,
} from './reviews.schema';
import type { ReviewsService } from './reviews.service';

export function reviewsRoutes(service: ReviewsService, session: SessionReader): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    r.get(
      '/me/reviews',
      {
        schema: {
          querystring: accountPageQuerySchema,
          response: { 200: myReviewsSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        void reply.header('cache-control', 'private, no-store');
        return service.mine(customerId, request.query);
      },
    );

    r.post(
      '/me/reviews',
      { schema: { body: reviewInputSchema, response: { 201: myReviewsSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        return reply.status(201).send(await service.write(customerId, request.body));
      },
    );
  };
}
