import { FLASH_CHECKOUT_LIMIT, type CustomerId } from '@borneo/shared';
import type { AppDeps } from './app';
import {
  createDemoNotifier,
  createInboxOnlyNotifier,
  type NotifierDeps,
} from './adapters/notifications/index';
import {
  createMockGateway,
  createUnconfiguredGateway,
  type PaymentGateway,
} from './adapters/payments/index';
import {
  createDemoBotProtection,
  createUnconfiguredBotProtection,
  type BotProtection,
} from './adapters/bot/index';
import { createDemoCourier, createUnconfiguredCourier } from './adapters/courier/index';
import type { Db } from './db/client';
import { renderInvoicePdf } from './documents/invoice';
import { noJobs } from './jobs/index';
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
  listCategoryProducts,
  countProducts,
  listLineProducts,
  findUpgradeTarget,
  listedProductFacts,
  listProducts,
  listProductsByIds,
  loadCartBundles,
  loadCartItems,
  loadFaqs,
  loadImages,
  loadOrderFacts,
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
import {
  createOffersService,
  listFlashForDeals,
  listFlashListings,
  loadDisposableDomains,
  loadOfferBook,
} from './modules/offers/index';
import {
  advanceOrder,
  cancelOrder,
  countFlashPurchases,
  createOrdersService,
  expireHold,
  failAttempt,
  findCustomerEmail,
  findOrder,
  findOrderIdByKey,
  countOrders,
  issueInvoice,
  listDeliveredLines,
  listOrders,
  placeOrder,
  setGatewayRef,
  settlePayment,
  startAttempt,
  type OrderJobs,
} from './modules/orders/index';
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

import { createAccountService, findMemberSince } from './modules/account/index';
import { createUpgradeService, listOwnedForUpgrade } from './modules/upgrade/index';
import {
  addToWishlist,
  createWishlistService,
  findWishlistTarget,
  listWishlist,
  listWishlistSlugs,
  removeFromWishlist,
} from './modules/wishlist/index';
import {
  advanceReturn,
  countOpenReturns,
  createReturnRequest,
  createReturnsService,
  findReturn,
  findReturnPhoto,
  findReturnTarget,
  listReturns,
} from './modules/returns/index';
import {
  createReviewsService,
  findReviewableLine,
  insertReview,
  listMyReviews,
  listReviewedProductIds,
} from './modules/reviews/index';
import {
  addWatch,
  countWatch,
  createWatchService,
  findWatchTarget,
  listWatch,
  removeWatch,
} from './modules/watch/index';

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
    listCategoryProducts: (categoryId) => listCategoryProducts(db, categoryId),
    countProducts: (query) => countProducts(db, query),
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

export function offersService(
  db: Db,
  catalog: ReturnType<typeof catalogService>,
  now: () => number = Date.now,
) {
  return createOffersService({
    now,
    loadOfferBook: (at) => loadOfferBook(db, new Date(at)),
    listFlashListings: (at) => listFlashListings(db, new Date(at)),
    listFlashForDeals: (at, until) => listFlashForDeals(db, new Date(at), new Date(until)),
    listProducts: (ids) => listProductsByIds(db, ids),
    summarize: (rows) => catalog.summarize(rows),
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

/** Checkout and orders on the account cart (Phase K). */
export function ordersService(
  db: Db,
  cart: ReturnType<typeof cartService>,
  options: {
    demoMode: boolean;
    jobs: OrderJobs;
    gateway: PaymentGateway;
    notifications: ReturnType<typeof notificationAdapter>;
    now: () => number;
    log: NotifierDeps['log'];
    bot: BotProtection;
    rateLimiter: ReturnType<typeof createRateLimiter>;
  },
) {
  return createOrdersService({
    now: options.now,
    demoMode: options.demoMode,
    forCheckout: (customerId, pincode) => cart.forCheckout(customerId, pincode),
    removeOrdered: (customerId, ordered) => cart.removeOrdered(customerId, ordered),
    listAddresses: (customerId) => listAddresses(customerId, db),
    listLanes: () => listDeliveryLanes(db),
    loadOrderFacts: (skus) => loadOrderFacts(db, skus),
    loadDisposableDomains: () => loadDisposableDomains(db),
    countFlashPurchases: (customerId, saleIds) => countFlashPurchases(customerId, db, saleIds),
    findCustomerEmail: (customerId) => findCustomerEmail(customerId, db),
    findOrderIdByKey: (customerId, key) => findOrderIdByKey(customerId, db, key),
    placeOrder: (customerId, order) => placeOrder(customerId, db, order),
    findOrder: (customerId, id) => findOrder(customerId, db, id),
    expireHold: (customerId, id, at) => expireHold(customerId, db, id, new Date(at)),
    settlePayment: (customerId, input) =>
      settlePayment(customerId, db, { ...input, at: new Date(input.at) }),
    failAttempt: (customerId, id, attemptId) => failAttempt(customerId, db, id, attemptId),
    startAttempt: (customerId, id, at) => startAttempt(customerId, db, id, new Date(at)),
    setGatewayRef: (customerId, id, attemptId, ref) =>
      setGatewayRef(customerId, db, id, attemptId, ref),
    issueInvoice: (customerId, id, number, at) =>
      issueInvoice(customerId, db, id, number, new Date(at)),
    listOrders: (customerId, page) => listOrders(customerId, db, page),
    cancelOrder: (customerId, id, decide, at) =>
      cancelOrder(customerId, db, id, decide, new Date(at)),
    advanceOrder: (customerId, input) =>
      advanceOrder(customerId, db, {
        ...input,
        at: new Date(input.at),
        returnWindowEndsAt: new Date(input.returnWindowEndsAt),
      }),
    loadImages: (ids) => loadImages(db, ids),
    gateway: options.gateway,
    courier: options.demoMode ? createDemoCourier() : createUnconfiguredCourier(),
    bot: options.bot,
    limitFlash: (key) => options.rateLimiter.hit(key, FLASH_CHECKOUT_LIMIT),
    jobs: options.jobs,
    notifications: options.notifications,
    renderInvoice: renderInvoicePdf,
    log: options.log,
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
  /** Background jobs (pg-boss in main.ts); without them holds end lazily on read (D-57). */
  jobs?: OrderJobs;
};

const consoleLog: NotifierDeps['log'] = {
  info: (obj, msg) => console.info(msg, obj),
  warn: (obj, msg) => console.warn(msg, obj),
};

/** After the order (Phase L): returns, reviews, Watch and the account overview. */
export function postPurchaseServices(
  db: Db,
  catalog: ReturnType<typeof catalogService>,
  options: {
    demoMode: boolean;
    notifications: ReturnType<typeof notificationAdapter>;
    now: () => number;
    log: NotifierDeps['log'];
  },
) {
  const { now } = options;
  const listDelivered = (customerId: CustomerId) => listDeliveredLines(customerId, db);
  return {
    returns: createReturnsService({
      now,
      demoMode: options.demoMode,
      findTarget: (customerId, orderId, itemId) =>
        findReturnTarget(customerId, db, orderId, itemId),
      create: (customerId, input) => createReturnRequest(customerId, db, input),
      list: (customerId, page) => listReturns(customerId, db, page),
      find: (customerId, id) => findReturn(customerId, db, id),
      findPhoto: (customerId, id, photoId) => findReturnPhoto(customerId, db, id, photoId),
      advance: (customerId, input) =>
        advanceReturn(customerId, db, { ...input, at: new Date(input.at) }),
      findCustomerEmail: (customerId) => findCustomerEmail(customerId, db),
      notifications: options.notifications,
      log: options.log,
    }),
    reviews: createReviewsService({
      now,
      listDelivered,
      listMine: (customerId, page) => listMyReviews(customerId, db, page),
      reviewedProductIds: (customerId) => listReviewedProductIds(customerId, db),
      findLine: (customerId, itemId) => findReviewableLine(customerId, db, itemId),
      insert: (customerId, values) => insertReview(customerId, db, values),
      loadImages: (ids) => loadImages(db, ids),
    }),
    watch: createWatchService({
      now,
      findTarget: (customerId, sku) => findWatchTarget(customerId, db, sku),
      list: (customerId) => listWatch(customerId, db),
      count: (customerId) => countWatch(customerId, db),
      add: (customerId, variantId, at) => addWatch(customerId, db, variantId, new Date(at)),
      remove: (customerId, variantId) => removeWatch(customerId, db, variantId),
      loadImages: (ids) => loadImages(db, ids),
    }),
    wishlist: createWishlistService({
      now,
      findTarget: (customerId, slug) => findWishlistTarget(customerId, db, slug),
      add: (customerId, productId, at) => addToWishlist(customerId, db, productId, new Date(at)),
      remove: (customerId, productId) => removeFromWishlist(customerId, db, productId),
      list: (customerId, page) => listWishlist(customerId, db, page),
      slugs: (customerId) => listWishlistSlugs(customerId, db),
      loadRows: (ids) => listProductsByIds(db, ids),
      summarize: (rows) => catalog.summarize(rows),
    }),
    upgrade: createUpgradeService({
      now,
      listOwned: (customerId) => listOwnedForUpgrade(customerId, db),
      listLineProducts: (lineIds) => listLineProducts(db, lineIds),
      findTarget: (slug) => findUpgradeTarget(db, slug),
      listAttributeDefs: (categoryId) => listAttributeDefs(db, categoryId),
      listBuyable: (ids) => listProductsByIds(db, ids),
      summarize: (rows) => catalog.summarize(rows),
    }),
    account: createAccountService({
      listDelivered,
      countOrders: (customerId) => countOrders(customerId, db),
      reviewedProductIds: (customerId) => listReviewedProductIds(customerId, db),
      countWatch: (customerId) => countWatch(customerId, db),
      countOpenReturns: (customerId) => countOpenReturns(customerId, db),
      memberSince: (customerId) => findMemberSince(customerId, db),
      loadEdges: (ids) => loadRelationsFromMany(db, ids),
      listBuyable: (ids) => listProductsByIds(db, ids),
      summarize: (rows) => catalog.summarize(rows),
      loadImages: (ids) => loadImages(db, ids),
    }),
  };
}

/** Every service the app needs, bound to one database. */
export function appDeps(db: Db, config: AppConfig): AppDeps {
  const now = config.now ?? Date.now;
  const catalog = catalogService(db, now);
  const delivery = deliveryService(db, now);
  const betterAuth = createBetterAuth(db, config.auth);
  const notifications = notificationAdapter(db, config.demoMode, config.log ?? consoleLog);
  const cart = cartService(db, catalog, delivery, now);
  const rateLimiter = createRateLimiter();
  return {
    health: createHealthService({
      demoMode: config.demoMode,
      pingDatabase: () => pingDatabase(db),
    }),
    catalog,
    search: searchService(db, catalog),
    delivery,
    offers: offersService(db, catalog, now),
    auth: createAuthService({
      identity: betterAuthIdentity(betterAuth),
      notifications,
    }),
    addresses: addressesService(db),
    notifications: notificationsService(db, now),
    cart,
    orders: ordersService(db, cart, {
      demoMode: config.demoMode,
      jobs: config.jobs ?? noJobs,
      // A real gateway is a production blocker (D-74): only the demo can take payments.
      gateway: config.demoMode ? createMockGateway() : createUnconfiguredGateway(),
      notifications,
      now,
      log: config.log ?? consoleLog,
      // A real bot check is a production blocker (D-144): only the demo has a mock one.
      bot: config.demoMode ? createDemoBotProtection(now) : createUnconfiguredBotProtection(),
      rateLimiter,
    }),
    ...postPurchaseServices(db, catalog, {
      demoMode: config.demoMode,
      notifications,
      now,
      log: config.log ?? consoleLog,
    }),
    session: betterAuthSession(betterAuth),
    rateLimiter,
    allowedOrigins: [config.webOrigin],
    trustProxy: config.trustProxy ?? '127.0.0.1,::1,::ffff:127.0.0.1',
  };
}
