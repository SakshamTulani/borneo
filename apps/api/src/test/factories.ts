import { randomUUID } from 'node:crypto';
import { toCustomerId, type CustomerId } from '@borneo/shared';
import type { CatalogDeps } from '../modules/catalog/catalog.service';
import type { DeliveryDeps } from '../modules/delivery/delivery.service';
import type { SearchDeps } from '../modules/search/search.service';

// Test data factories. Grows per phase (products, orders, ...).

export function makeCustomerId(): CustomerId {
  return toCustomerId(randomUUID());
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
