import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { addressesRoutes, type AddressesService } from './modules/addresses/index';
import { authRoutes, type AuthService } from './modules/auth/index';
import { cartRoutes, type CartService } from './modules/cart/index';
import { catalogRoutes, type CatalogService } from './modules/catalog/index';
import { deliveryRoutes, type DeliveryService } from './modules/delivery/index';
import { healthRoutes, type HealthService } from './modules/health/index';
import { notificationsRoutes, type NotificationsService } from './modules/notifications/index';
import { offersRoutes, type OffersService } from './modules/offers/index';
import { ordersRoutes, type OrdersService } from './modules/orders/index';
import { accountRoutes, type AccountService } from './modules/account/index';
import { returnsRoutes, type ReturnsService } from './modules/returns/index';
import { reviewsRoutes, type ReviewsService } from './modules/reviews/index';
import { searchRoutes, type SearchService } from './modules/search/index';
import { watchRoutes, type WatchService } from './modules/watch/index';
import { registerErrorHandler } from './plugins/errors';
import { registerOriginGuard } from './plugins/origin';
import type { RateLimiter } from './plugins/rateLimit';
import type { SessionReader } from './session/index';

export type AppDeps = {
  health: HealthService;
  catalog: CatalogService;
  search: SearchService;
  delivery: DeliveryService;
  offers: OffersService;
  auth: AuthService;
  addresses: AddressesService;
  notifications: NotificationsService;
  cart: CartService;
  orders: OrdersService;
  returns: ReturnsService;
  reviews: ReviewsService;
  watch: WatchService;
  account: AccountService;
  session: SessionReader;
  rateLimiter: RateLimiter;
  /** Browser origins allowed to make cookie-authenticated writes. */
  allowedOrigins: readonly string[];
  /** Proxy addresses whose X-Forwarded-For is believed (client IPs for rate limits, D-190). */
  trustProxy: string;
};

/** Composition root: wires services into route plugins. */
export function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test', trustProxy: deps.trustProxy });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);
  registerOriginGuard(app, deps.allowedOrigins);
  app.register(healthRoutes(deps.health));
  app.register(catalogRoutes(deps.catalog));
  app.register(searchRoutes(deps.search));
  app.register(deliveryRoutes(deps.delivery));
  app.register(offersRoutes(deps.offers));
  app.register(authRoutes(deps.auth, deps.rateLimiter));
  app.register(addressesRoutes(deps.addresses, deps.session));
  app.register(notificationsRoutes(deps.notifications, deps.session));
  app.register(cartRoutes(deps.cart, deps.session));
  app.register(ordersRoutes(deps.orders, deps.session));
  app.register(returnsRoutes(deps.returns, deps.session));
  app.register(reviewsRoutes(deps.reviews, deps.session));
  app.register(watchRoutes(deps.watch, deps.session));
  app.register(accountRoutes(deps.account, deps.session));
  return app;
}
