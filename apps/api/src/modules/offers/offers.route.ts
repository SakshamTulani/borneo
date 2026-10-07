import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { dealsViewSchema, offerStripSchema } from './offers.schema';
import type { OffersService } from './offers.service';

export function offersRoutes(service: OffersService): FastifyPluginAsync {
  return async (app) => {
    app
      .withTypeProvider<ZodTypeProvider>()
      .get('/offers/live', { schema: { response: { 200: offerStripSchema } } }, () =>
        service.live(),
      )
      .get('/deals', { schema: { response: { 200: dealsViewSchema } } }, () => service.deals());
  };
}
