import { randomUUID } from 'node:crypto';
import {
  checkoutViewSchema,
  orderViewSchema,
  toCustomerId,
  type CustomerId,
  type OrderView,
} from '@borneo/shared';
import type { AppDeps, buildApp } from '../app';
import type { Db } from '../db/client';
import {
  address,
  category,
  flashSale,
  inventory,
  product,
  productLine,
  serviceability,
  user,
  variant,
} from '../db/schema/index';
import { seedId } from '../db/seed/ids';
import { createUnconfiguredBotProtection } from '../adapters/bot/index';
import { createUnconfiguredCourier } from '../adapters/courier/index';
import { noJobs } from '../jobs/index';
import { createAccountService } from '../modules/account/index';
import { createOrdersService } from '../modules/orders/index';
import { createReturnsService } from '../modules/returns/index';
import { createReviewsService } from '../modules/reviews/index';
import { createUpgradeService } from '../modules/upgrade/index';
import { createWatchService } from '../modules/watch/index';
import type { OrdersDeps } from '../modules/orders/orders.service';
import type { AddressesDeps } from '../modules/addresses/addresses.service';
import { createAddressesService } from '../modules/addresses/index';
import { createAuthService, type IdentityPort } from '../modules/auth/index';
import type { CartDeps } from '../modules/cart/cart.service';
import { changeCart, createCartService } from '../modules/cart/index';
import type { CatalogDeps } from '../modules/catalog/catalog.service';
import { createCatalogService } from '../modules/catalog/index';
import { createDeliveryService } from '../modules/delivery/index';
import { createHealthService } from '../modules/health/index';
import type { NotificationsDeps } from '../modules/notifications/notifications.service';
import { createNotificationsService } from '../modules/notifications/index';
import { createOffersService } from '../modules/offers/index';
import { createSearchService } from '../modules/search/index';
import { createRateLimiter } from '../plugins/rateLimit';
import type { SessionReader } from '../session/index';
import type { DeliveryDeps } from '../modules/delivery/delivery.service';
import type { SearchDeps } from '../modules/search/search.service';

// Test data factories. Grows per phase (products, orders, ...).

export function makeCustomerId(): CustomerId {
  return toCustomerId(randomUUID());
}

/** A customer row (Better Auth user) in the test database, for tables that reference it. */
export async function insertCustomer(db: Db, name = 'Test customer'): Promise<CustomerId> {
  const id = makeCustomerId();
  await db.insert(user).values({ id, name, email: `${id}@example.com` });
  return id;
}

/** Two customers that exist in the test database (ADR-0005). */
export async function insertTwoCustomers(
  db: Db,
): Promise<{ owner: CustomerId; other: CustomerId }> {
  return { owner: await insertCustomer(db, 'Owner'), other: await insertCustomer(db, 'Other') };
}

/** Two distinct customers for cross-customer tests (ADR-0005). */
export function makeTwoCustomers(): { owner: CustomerId; other: CustomerId } {
  return { owner: makeCustomerId(), other: makeCustomerId() };
}

/** Catalog service deps that return nothing; override what a test needs. */
export function emptyCatalogDeps(over: Partial<CatalogDeps> = {}): CatalogDeps {
  return {
    now: () => 0,
    listCategories: async () => [],
    findCategoryBySlug: async () => undefined,
    listProducts: async () => [],
    listProductsByIds: async () => [],
    listedProductFacts: async () => [],
    loadVariantStates: async () => [],
    loadRatings: async () => new Map(),
    loadImages: async () => new Map(),
    loadOfferBook: async () => ({ coupons: [], paymentOffers: [], emiPlans: [] }),
    findProductBySlug: async () => undefined,
    listAttributeDefs: async () => [],
    loadFaqs: async () => [],
    loadRelationsFrom: async () => [],
    loadBundlesFor: async () => [],
    listCategoryProducts: async () => [],
    countProducts: async () => 0,
    loadReviews: async () => [],
    loadRatingCounts: async () => [],
    ...over,
  };
}

/** Search service deps that find nothing; override what a test needs. */
export function emptySearchDeps(over: Partial<SearchDeps> = {}): SearchDeps {
  return {
    listSynonyms: async () => [],
    listCategories: async () => [],
    searchProducts: async () => [],
    findExactCandidates: async () => [],
    summarize: async () => [],
    ...over,
  };
}

/** Delivery service deps that know nothing; override what a test needs. */
export function emptyDeliveryDeps(over: Partial<DeliveryDeps> = {}): DeliveryDeps {
  return {
    now: () => 0,
    findTarget: async () => undefined,
    findArea: async () => undefined,
    areasNear: async () => [],
    loadServiceability: async () => [],
    loadStock: async () => [],
    listLanes: async () => [],
    loadFlashSales: async () => [],
    ...over,
  };
}

/** Address deps with an empty book; override what a test needs. */
export function emptyAddressesDeps(over: Partial<AddressesDeps> = {}): AddressesDeps {
  return {
    list: async () => [],
    insert: async () => {
      throw new Error('insert not faked');
    },
    update: async () => undefined,
    setDefault: async () => false,
    remove: async () => false,
    pincodeCentre: async () => undefined,
    ...over,
  };
}

/** Notification deps with an empty inbox; override what a test needs. */
export function emptyNotificationsDeps(over: Partial<NotificationsDeps> = {}): NotificationsDeps {
  return {
    now: () => 0,
    list: async () => [],
    countUnread: async () => 0,
    markRead: async () => false,
    markAllRead: async () => {},
    ...over,
  };
}

/** Cart deps with an empty catalog and in-memory carts; override what a test needs. */
export function emptyCartDeps(over: Partial<CartDeps> = {}): CartDeps {
  const carts = new Map<
    string,
    { entries: { key: string; qty: number }[]; couponCode: string | undefined }
  >();
  const read = (id: string) => carts.get(id) ?? { entries: [], couponCode: undefined };
  return {
    now: () => 0,
    loadOfferBook: async () => ({ coupons: [], paymentOffers: [], emiPlans: [] }),
    loadItems: async () => [],
    loadBundles: async () => [],
    readCart: async (customerId) => read(customerId),
    changeCart: async (customerId, change) => {
      const next = await change(read(customerId));
      carts.set(customerId, next);
      return next;
    },
    checkDelivery: async (sku, pincode) => ({
      pincode,
      place: null,
      estimate: { status: 'notDeliverable' },
    }),
    loadEdges: async () => [],
    listBuyable: async () => [],
    summarize: async () => [],
    soleVariantSkus: async () => new Map(),
    ...over,
  };
}

/** An identity provider that knows nobody; override what a test needs. */
export function emptyIdentity(over: Partial<IdentityPort> = {}): IdentityPort {
  const unused = async (): Promise<never> => {
    throw new Error('identity call not faked');
  };
  return {
    signUp: unused,
    signIn: unused,
    signOut: async () => [],
    current: async () => null,
    issueResetCode: async () => null,
    resetPassword: unused,
    updateProfile: unused,
    changePassword: unused,
    ...over,
  };
}

/** Session from the `x-test-customer` header, for route tests that don't exercise sign-in. */
export const headerSession: SessionReader = async (request) => {
  const id = request.headers['x-test-customer'];
  return typeof id === 'string' && id ? toCustomerId(id) : null;
};

/** App deps backed by fakes only (no database). */
export function fakeAppDeps(over: Partial<AppDeps> = {}): AppDeps {
  return {
    health: createHealthService({ demoMode: false, pingDatabase: async () => true }),
    catalog: createCatalogService(emptyCatalogDeps()),
    search: createSearchService(emptySearchDeps()),
    delivery: createDeliveryService(emptyDeliveryDeps()),
    offers: createOffersService({
      now: () => 0,
      loadOfferBook: async () => ({ coupons: [], paymentOffers: [], emiPlans: [] }),
      listFlashListings: async () => [],
      listFlashForDeals: async () => [],
      listProducts: async () => [],
      summarize: async () => [],
    }),
    auth: createAuthService({
      identity: emptyIdentity(),
      notifications: { send: async () => null },
    }),
    addresses: createAddressesService(emptyAddressesDeps()),
    notifications: createNotificationsService(emptyNotificationsDeps()),
    cart: createCartService(emptyCartDeps()),
    orders: createOrdersService(emptyOrdersDeps()),
    returns: createReturnsService({
      now: () => 0,
      demoMode: false,
      findTarget: async () => undefined,
      create: async () => null,
      list: async () => [],
      find: async () => undefined,
      findPhoto: async () => undefined,
      advance: async () => false,
      findCustomerEmail: async () => undefined,
      notifications: { send: async () => null },
      log: { warn: () => {} },
    }),
    reviews: createReviewsService({
      now: () => 0,
      listDelivered: async () => [],
      listMine: async () => [],
      reviewedProductIds: async () => new Set(),
      findLine: async () => undefined,
      insert: async () => null,
      loadImages: async () => new Map(),
    }),
    watch: createWatchService({
      now: () => 0,
      findTarget: async () => undefined,
      list: async () => [],
      count: async () => 0,
      add: async () => {},
      remove: async () => {},
      loadImages: async () => new Map(),
    }),
    upgrade: createUpgradeService({
      now: () => 0,
      listOwned: async () => [],
      listLineProducts: async () => [],
      findTarget: async () => undefined,
      listAttributeDefs: async () => [],
      listBuyable: async () => [],
      summarize: async () => [],
    }),
    account: createAccountService({
      listDelivered: async () => [],
      countOrders: async () => new Map(),
      reviewedProductIds: async () => new Set(),
      countWatch: async () => 0,
      countOpenReturns: async () => 0,
      memberSince: async () => undefined,
      loadEdges: async () => [],
      listBuyable: async () => [],
      summarize: async () => [],
      loadImages: async () => new Map(),
    }),
    session: headerSession,
    rateLimiter: createRateLimiter(),
    allowedOrigins: ['http://localhost:5173'],
    trustProxy: '127.0.0.1',
    ...over,
  };
}

/** Orders deps with no data and no effects; override what a test needs. */
export function emptyOrdersDeps(over: Partial<OrdersDeps> = {}): OrdersDeps {
  const none = async () => undefined;
  return {
    now: () => 0,
    demoMode: false,
    forCheckout: async () => {
      throw new Error('no cart in emptyOrdersDeps');
    },
    removeOrdered: async () => {},
    listAddresses: async () => [],
    listLanes: async () => [],
    loadOrderFacts: async () => [],
    loadDisposableDomains: async () => new Set(),
    countFlashPurchases: async () => new Map(),
    findCustomerEmail: none,
    findOrderIdByKey: none,
    placeOrder: async () => ({ status: 'conflict', code: 'OUT_OF_STOCK' }),
    findOrder: none,
    expireHold: async () => false,
    settlePayment: async () => 'unchanged',
    failAttempt: async () => false,
    startAttempt: async () => null,
    setGatewayRef: async () => {},
    issueInvoice: async () => {},
    listOrders: async () => ({ rows: [], hasMore: false }),
    cancelOrder: async () => null,
    advanceOrder: async () => false,
    loadImages: async () => new Map(),
    gateway: { available: false, startSession: async () => ({ gatewayRef: '' }) },
    courier: createUnconfiguredCourier(),
    bot: createUnconfiguredBotProtection(),
    limitFlash: () => {},
    jobs: noJobs,
    notifications: { send: async () => null },
    renderInvoice: () => new Uint8Array(),
    log: { warn: () => {} },
    ...over,
  };
}

/**
 * Something to sell, private to one test: its own category (served at `pincode`, COD as given),
 * line, product and variant with stock per seeded warehouse. Nothing seeded changes, so other
 * suites reading the catalog in parallel see the same data.
 */
export async function insertSellable(
  db: Db,
  options: {
    stock?: Partial<Record<'blr' | 'ggn' | 'bhw', number>>;
    pricePaise?: number;
    mrpPaise?: number;
    pincode?: string;
    codAllowed?: boolean;
    flash?: { salePricePaise: number; cap: number; sold?: number; endsAt: Date };
    now?: Date;
  } = {},
) {
  const key = randomUUID().slice(0, 8);
  const sku = `TK-${key.toUpperCase()}`;
  const [cat] = await db
    .insert(category)
    .values({
      slug: `test-${key}`,
      name: `Test ${key}`,
      depth: 'template',
      config: { filters: [], specGroups: [], compare: [] },
      returnPolicy: 'return',
      hsnCode: '8518',
      sort: 999,
    })
    .returning({ id: category.id });
  await db.insert(serviceability).values({
    pincode: options.pincode ?? '560034',
    categoryId: cat!.id,
    deliverable: true,
    codAllowed: options.codAllowed ?? true,
  });
  const [line] = await db
    .insert(productLine)
    .values({ categoryId: cat!.id, name: `Test line ${key}` })
    .returning({ id: productLine.id });
  const [p] = await db
    .insert(product)
    .values({
      lineId: line!.id,
      categoryId: cat!.id,
      slug: `test-product-${key}`,
      name: `Order fixture ${key}`,
      modelNumber: `TK${key}`,
      generation: 1,
      tier: 'value',
      familyTier: 'standard',
      status: 'live',
    })
    .returning({ id: product.id });
  const pricePaise = options.pricePaise ?? 199_900;
  const [v] = await db
    .insert(variant)
    .values({ productId: p!.id, sku, mrpPaise: options.mrpPaise ?? pricePaise, pricePaise })
    .returning({ id: variant.id });
  for (const [code, onHand] of Object.entries(options.stock ?? { blr: 5 }))
    await db
      .insert(inventory)
      .values({ warehouseId: seedId('warehouse', code), variantId: v!.id, onHand });
  let flashSaleId: string | undefined;
  if (options.flash) {
    const now = options.now ?? new Date();
    const [sale] = await db
      .insert(flashSale)
      .values({
        variantId: v!.id,
        salePricePaise: options.flash.salePricePaise,
        startsAt: new Date(now.getTime() - 60_000),
        endsAt: options.flash.endsAt,
        cap: options.flash.cap,
        sold: options.flash.sold ?? 0,
      })
      .returning({ id: flashSale.id });
    flashSaleId = sale!.id;
  }
  return { sku, key: `item:${sku}`, variantId: v!.id, categoryId: cat!.id, flashSaleId };
}

/** A customer with a default delivery address at `pincode` (a Bengaluru pin by default). */
export async function insertShopper(db: Db, pincode = '560034') {
  const customerId = await insertCustomer(db, 'Asha Rao');
  const [row] = await db
    .insert(address)
    .values({
      customerId,
      name: 'Asha Rao',
      phone: '9876543210',
      line1: '12, 4th Cross, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode,
      lat: 12.9279,
      lng: 77.6271,
      isDefault: true,
    })
    .returning({ id: address.id });
  return { customerId, addressId: row!.id };
}

type TestApp = Pick<ReturnType<typeof buildApp>, 'inject'>;
type Shopper = { customerId: CustomerId; addressId: string };
let orderKeys = 0;

/** A shopper (default address in Bengaluru) whose cart holds `qty` of `cartKey`. */
export async function insertBuyer(db: Db, cartKey: string, qty = 1): Promise<Shopper> {
  const shopper = await insertShopper(db);
  await putInCart(db, shopper.customerId, cartKey, qty);
  return shopper;
}

/** Replaces the customer's cart with `qty` of `cartKey`. */
export async function putInCart(db: Db, customerId: CustomerId, cartKey: string, qty = 1) {
  await changeCart(customerId, db, () => ({
    entries: [{ key: cartKey, qty }],
    couponCode: undefined,
  }));
}

/**
 * Places the shopper's cart through the API (`app` with `headerSession`), at the total the
 * checkout quotes. `pay` settles a prepaid order on the mock gateway (demo mode).
 */
export async function placeViaApi(
  app: TestApp,
  shopper: Shopper,
  method: 'cod' | 'upi' | 'card' = 'cod',
  options: { pay?: boolean } = {},
): Promise<OrderView> {
  const headers = { 'x-test-customer': shopper.customerId };
  const quote = checkoutViewSchema.parse(
    (await app.inject({ method: 'GET', url: `/me/checkout?method=${method}`, headers })).json(),
  );
  const res = await app.inject({
    method: 'POST',
    url: '/me/orders',
    headers: { ...headers, 'idempotency-key': `factory-${Date.now()}-${orderKeys++}` },
    payload: {
      addressId: shopper.addressId,
      payment: { method },
      expectedTotalPaise: quote.totals.totalPaise,
    },
  });
  if (res.statusCode !== 200) throw new Error(`placing failed: ${res.statusCode} ${res.body}`);
  const order = orderViewSchema.parse(res.json());
  if (!options.pay || method === 'cod') return order;
  const paid = await app.inject({
    method: 'POST',
    url: `/me/orders/${order.id}/payments/${order.payment.attemptId}/mock`,
    headers,
    payload: { result: 'success' },
  });
  return orderViewSchema.parse(paid.json());
}

/** Presses the demo "Advance" `times` times (demo mode); the last view. */
export async function advanceViaApi(
  app: TestApp,
  customerId: CustomerId,
  orderId: string,
  times: number,
): Promise<OrderView> {
  let view: OrderView | undefined;
  for (let i = 0; i < times; i++) {
    const res = await app.inject({
      method: 'POST',
      url: `/me/orders/${orderId}/demo/advance`,
      headers: { 'x-test-customer': customerId },
    });
    if (res.statusCode !== 200) throw new Error(`advance failed: ${res.statusCode} ${res.body}`);
    view = orderViewSchema.parse(res.json());
  }
  return view!;
}

/**
 * A delivered order of one fresh sellable for a fresh shopper, via the API (demo mode,
 * `headerSession`): placed (COD, or prepaid and paid) and advanced to delivered (D-215).
 */
export async function insertDeliveredOrder(
  app: TestApp,
  db: Db,
  options: { method?: 'cod' | 'upi'; qty?: number; shopper?: Shopper; sku?: string } = {},
) {
  const item = options.sku
    ? { sku: options.sku, key: `item:${options.sku}` }
    : await insertSellable(db, { stock: { blr: 5 } });
  const shopper = options.shopper ?? (await insertShopper(db));
  await putInCart(db, shopper.customerId, item.key, options.qty ?? 1);
  const placed = await placeViaApi(app, shopper, options.method ?? 'cod', { pay: true });
  const order = await advanceViaApi(app, shopper.customerId, placed.id, 4);
  return { item, shopper, order };
}
