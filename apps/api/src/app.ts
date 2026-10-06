import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { catalogRoutes, type CatalogService } from './modules/catalog/index';
import { deliveryRoutes, type DeliveryService } from './modules/delivery/index';
import { healthRoutes, type HealthService } from './modules/health/index';
import { searchRoutes, type SearchService } from './modules/search/index';
import { registerErrorHandler } from './plugins/errors';

export type AppDeps = {
  health: HealthService;
  catalog: CatalogService;
  search: SearchService;
  delivery: DeliveryService;
};

/** Composition root: wires services into route plugins. */
export function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);
  app.register(healthRoutes(deps.health));
  app.register(catalogRoutes(deps.catalog));
  app.register(searchRoutes(deps.search));
  app.register(deliveryRoutes(deps.delivery));
  return app;
}
