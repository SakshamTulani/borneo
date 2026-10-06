import type { AppDeps } from './app';
import {
  createDemoNotifier,
  createInboxOnlyNotifier,
  type NotifierDeps,
} from './adapters/notifications/index';
import type { Db } from './db/client';
import {
  createAddressesService,
  deleteAddress,
  insertAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from './modules/addresses/index';
import { createAuthService } from './modules/auth/index';
import { changeCart, createCartService, readCart } from './modules/cart/index';
import { createHealthService, pingDatabase } from './modules/health/index';
import {
  countUnread,
  createNotificationsService,
  insertNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './modules/notifications/index';
import { createRateLimiter } from './plugins/rateLimit';
import {
  betterAuthIdentity,
  betterAuthSession,
  createBetterAuth,
  type AuthConfig,
} from './session/index';
import {
  createCatalogService,
  findCategoryBySlug,
  findProductBySlug,
  listAttributeDefs,
  listCategories,
  listedProductFacts,
  listProducts,
  listProductsByIds,
  loadCartBundles,
  loadCartItems,
  loadFaqs,
  loadImages,
  loadRatingCounts,
  loadRatings,
  loadRelationsFrom,
  loadReviews,
  loadRelationsFromMany,
  loadVariantStates,
  soleVariantSkus,
} from './modules/catalog/index';
import {
  createDeliveryService,
  findDeliveryTarget,
  findPincodeArea,
  listDeliveryLanes,
  loadFlashSales,
  loadServiceability,
  loadWarehouseStock,
  pincodeAreasNear,
} from './modules/delivery/index';
import { createOffersService, listFlashListings, loadOfferBook } from './modules/offers/index';
import {
  createSearchService,
  findExactCandidates,
  listSynonyms,
  searchProducts,
} from './modules/search/index';
import {
  createRelationsService,
  loadRelationInputs,
  replaceRelations,
} from './modules/relations/index';

// Binds repositories to a database. Used by main.ts, the reset script and integration tests.

/** `now` is the clock for prices, offers and flash sales; tests pin it. */
export function catalogService(db: Db, now: () => number = Date.now) {
  return createCatalogService({
    now,
    listCategories: () => listCategories(db),
    findCategoryBySlug: (slug) => findCategoryBySlug(db, slug),
    listProducts: (query) => listProducts(db, query),
    listProductsByIds: (ids) => listProductsByIds(db, ids),
    listedProductFacts: (categoryId) => listedProductFacts(db, categoryId),
    loadVariantStates: (ids, at) => loadVariantStates(db, ids, new Date(at)),
    loadRatings: (ids) => loadRatings(db, ids),
    loadImages: (ids) => loadImages(db, ids),
    loadOfferBook: (at) => loadOfferBook(db, new Date(at)),
    findProductBySlug: (slug) => findProductBySlug(db, slug),
    listAttributeDefs: (categoryId) => listAttributeDefs(db, categoryId),
    loadFaqs: (productId, categoryId) => loadFaqs(db, productId, categoryId),
    loadRelationsFrom: (productId) => loadRelationsFrom(db, productId),
    loadBundlesFor: (productId, at) => loadCartBundles(db, { productId }, new Date(at)),
    loadReviews: (productId, page) => loadReviews(db, productId, page),
    loadRatingCounts: (productId) => loadRatingCounts(db, productId),
  });
}

export function relationsService(db: Db) {
  return createRelationsService({
    loadInputs: () => loadRelationInputs(db),
    replaceRelations: (edges) => replaceRelations(db, edges),
  });
}

/** Search reuses the catalog's card builder so results price exactly like listings. */
export function searchService(db: Db, catalog: ReturnType<typeof catalogService>) {
  return createSearchService({
    listSynonyms: () => listSynonyms(db),
    listCategories: () => listCategories(db),
    searchProducts: (query) => searchProducts(db, query),
    findExactCandidates: (query) => findExactCandidates(db, query),
    summarize: (rows) => catalog.summarize(rows),
  });
}

export function deliveryService(db: Db, now: () => number = Date.now) {
  return createDeliveryService({
    now,
    findTarget: (sku) => findDeliveryTarget(db, sku),
    findArea: (pincode) => findPincodeArea(db, pincode),
    areasNear: (pin, km) => pincodeAreasNear(db, pin, km),
    loadServiceability: (pincode, categoryId) => loadServiceability(db, pincode, categoryId),
    loadStock: (variantId) => loadWarehouseStock(db, variantId),
    listLanes: () => listDeliveryLanes(db),
    loadFlashSales: (variantId) => loadFlashSales(db, variantId),
  });
}

/** Demo: on-screen box + inbox + log (D-95, D-101). Otherwise inbox + log until D-104. */
export function notificationAdapter(db: Db, demoMode: boolean, log: NotifierDeps['log']) {
  const deps: NotifierDeps = {
    saveToInbox: (customerId, entry) => insertNotification(customerId, db, entry),
    log,
  };
  return demoMode ? createDemoNotifier(deps) : createInboxOnlyNotifier(deps);
}

export function offersService(db: Db, now: () => number = Date.now) {
  return createOffersService({
    now,
    loadOfferBook: (at) => loadOfferBook(db, new Date(at)),
    listFlashListings: (at) => listFlashListings(db, new Date(at)),
  });
}

export function addressesService(db: Db) {
  return createAddressesService({
    list: (customerId) => listAddresses(customerId, db),
    insert: (customerId, values, decide) => insertAddress(customerId, db, values, decide),
    update: (customerId, id, values) => updateAddress(customerId, db, id, values),
    setDefault: (customerId, id) => setDefaultAddress(customerId, db, id),
    remove: (customerId, id, next) => deleteAddress(customerId, db, id, next),
    pincodeCentre: (pincode) => findPincodeArea(db, pincode),
  });
}

export function notificationsService(db: Db, now: () => number = Date.now) {
  return createNotificationsService({
    now,
    list: (customerId, page) => listNotifications(customerId, db, page),
    countUnread: (customerId) => countUnread(customerId, db),
    markRead: (customerId, id, at) => markNotificationRead(customerId, db, id, at),
    markAllRead: (customerId, at) => markAllNotificationsRead(customerId, db, at),
  });
}

/** The cart prices like listings (catalog `summarize`) and checks delivery like the PDP. */
export function cartService(
  db: Db,
  catalog: ReturnType<typeof catalogService>,
  delivery: ReturnType<typeof deliveryService>,
  now: () => number = Date.now,
) {
  return createCartService({
    now,
    loadOfferBook: (at) => loadOfferBook(db, new Date(at)),
    loadItems: (skus, at) => loadCartItems(db, skus, new Date(at)),
    loadBundles: (slugs, at) => loadCartBundles(db, { slugs }, new Date(at)),
    readCart: (customerId) => readCart(customerId, db),
    changeCart: (customerId, change) => changeCart(customerId, db, change),
    checkDelivery: (sku, pincode, qty) => delivery.check(sku, pincode, qty),
    loadEdges: (ids) => loadRelationsFromMany(db, ids),
    listBuyable: (ids) => listProductsByIds(db, ids),
    summarize: (rows) => catalog.summarize(rows),
    soleVariantSkus: (ids) => soleVariantSkus(db, ids),
  });
}

export type AppConfig = {
  demoMode: boolean;
  auth: AuthConfig;
  webOrigin: string;
  /** See Env.TRUST_PROXY. */
  trustProxy?: string;
  /** Clock for prices, offers and flash sales; tests pin it. */
  now?: () => number;
  log?: NotifierDeps['log'];
};

const consoleLog: NotifierDeps['log'] = {
  info: (obj, msg) => console.info(msg, obj),
  warn: (obj, msg) => console.warn(msg, obj),
};

/** Every service the app needs, bound to one database. */
export function appDeps(db: Db, config: AppConfig): AppDeps {
  const now = config.now ?? Date.now;
  const catalog = catalogService(db, now);
  const delivery = deliveryService(db, now);
  const betterAuth = createBetterAuth(db, config.auth);
  return {
    health: createHealthService({
      demoMode: config.demoMode,
      pingDatabase: () => pingDatabase(db),
    }),
    catalog,
    search: searchService(db, catalog),
    delivery,
    offers: offersService(db, now),
    auth: createAuthService({
      identity: betterAuthIdentity(betterAuth),
      notifications: notificationAdapter(db, config.demoMode, config.log ?? consoleLog),
    }),
    addresses: addressesService(db),
    notifications: notificationsService(db, now),
    cart: cartService(db, catalog, delivery, now),
    session: betterAuthSession(betterAuth),
    rateLimiter: createRateLimiter(),
    allowedOrigins: [config.webOrigin],
    trustProxy: config.trustProxy ?? '127.0.0.1,::1,::ffff:127.0.0.1',
  };
}
