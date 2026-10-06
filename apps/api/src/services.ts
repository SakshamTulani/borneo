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
import { loadOfferBook } from './modules/offers/index';
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
