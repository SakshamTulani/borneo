import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  deliveryQuery,
  deliveryResponse,
  errorResponseSchema,
  pincodeAtQuery,
  pincodeAtResponse,
} from './delivery.schema';
import type { DeliveryService } from './delivery.service';

export function deliveryRoutes(service: DeliveryService): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();
    r.get(
      '/delivery',
      {
        schema: {
          querystring: deliveryQuery,
          response: { 200: deliveryResponse, 400: errorResponseSchema, 404: errorResponseSchema },
        },
      },
      (request) => service.check(request.query.sku, request.query.pincode, request.query.qty),
    );
    r.get(
      '/pincodes/at',
      {
        schema: {
          querystring: pincodeAtQuery,
          response: { 200: pincodeAtResponse, 400: errorResponseSchema, 404: errorResponseSchema },
        },
      },
      (request) => service.pincodeAt(request.query),
    );
  };
}
