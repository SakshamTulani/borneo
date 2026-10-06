import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { catalogRoutes, type CatalogService } from './modules/catalog/index';
import { healthRoutes, type HealthService } from './modules/health/index';
import { registerErrorHandler } from './plugins/errors';

export type AppDeps = { health: HealthService; catalog: CatalogService };

/** Composition root: wires services into route plugins. */
export function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);
  app.register(healthRoutes(deps.health));
  app.register(catalogRoutes(deps.catalog));
  return app;
}
