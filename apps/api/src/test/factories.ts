import { randomUUID } from 'node:crypto';
import { toCustomerId, type CustomerId } from '@borneo/shared';
import type { AppDeps } from '../app';
import type { Db } from '../db/client';
import { user } from '../db/schema/index';
import type { AddressesDeps } from '../modules/addresses/addresses.service';
import { createAddressesService } from '../modules/addresses/index';
import { createAuthService, type IdentityPort } from '../modules/auth/index';
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
    }),
    auth: createAuthService({
      identity: emptyIdentity(),
      notifications: { send: async () => null },
    }),
    addresses: createAddressesService(emptyAddressesDeps()),
    notifications: createNotificationsService(emptyNotificationsDeps()),
    session: headerSession,
    rateLimiter: createRateLimiter(),
    allowedOrigins: ['http://localhost:5173'],
    trustProxy: '127.0.0.1',
    ...over,
  };
}
