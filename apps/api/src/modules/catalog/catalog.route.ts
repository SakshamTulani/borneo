import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  categoryDetailResponse,
  categoryListResponse,
  errorResponseSchema,
  productDetailResponse,
  productListQuery,
  productListResponse,
  reviewPageResponse,
  reviewsQuery,
  slugParams,
} from './catalog.schema';
import type { CatalogService } from './catalog.service';

export function catalogRoutes(service: CatalogService): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();
    r.get('/categories', { schema: { response: { 200: categoryListResponse } } }, () =>
      service.listCategories(),
    );
    r.get(
      '/categories/:slug',
      {
        schema: {
          params: slugParams,
          response: {
            200: categoryDetailResponse,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      (request) => service.getCategory(request.params.slug),
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
    r.get(
      '/products/:slug',
      {
        schema: {
          params: slugParams,
          response: {
            200: productDetailResponse,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      (request) => service.getProduct(request.params.slug),
    );
    r.get(
      '/products/:slug/reviews',
      {
        schema: {
          params: slugParams,
          querystring: reviewsQuery,
          response: {
            200: reviewPageResponse,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      (request) =>
        service.listReviews(request.params.slug, request.query.cursor, request.query.limit),
    );
  };
}
