import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorResponseSchema, searchQuery, searchResponse } from './search.schema';
import type { SearchService } from './search.service';

export function searchRoutes(service: SearchService): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();
    r.get(
      '/search',
      {
        schema: {
          querystring: searchQuery,
          response: { 200: searchResponse, 400: errorResponseSchema },
        },
      },
      (request) =>
        service.search(request.query.q, request.query.limit, Number(request.query.cursor ?? 0)),
    );
  };
}
