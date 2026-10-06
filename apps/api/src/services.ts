import type { Db } from './db/client';
import {
  createCatalogService,
  findCategoryBySlug,
  findProductBySlug,
  listAttributeDefs,
  listCategories,
  listedProductFacts,
  listProducts,
  listProductsByIds,
  loadFaqs,
  loadImages,
  loadRatings,
  loadRelationsFrom,
  loadVariantStates,
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
import { loadOfferBook } from './modules/offers/index';
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
