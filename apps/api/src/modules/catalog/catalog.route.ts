import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  categoryListResponse,
  errorResponseSchema,
  productListQuery,
  productListResponse,
} from './catalog.schema';
import type { CatalogService } from './catalog.service';

export function catalogRoutes(service: CatalogService): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();
    r.get('/categories', { schema: { response: { 200: categoryListResponse } } }, () =>
      service.listCategories(),
    );
    r.get(
      '/products',
      {
        schema: {
          querystring: productListQuery,
          response: {
            200: productListResponse,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      (request) => service.listProducts(request.query),
    );
  };
}
