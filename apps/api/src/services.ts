import type { Db } from './db/client';
import {
  createCatalogService,
  findCategoryIdBySlug,
  listCategories,
  listProducts,
} from './modules/catalog/index';
import {
  createRelationsService,
  loadRelationInputs,
  replaceRelations,
} from './modules/relations/index';

// Binds repositories to a database. Used by main.ts, the reset script and integration tests.

export function catalogService(db: Db) {
  return createCatalogService({
    listCategories: () => listCategories(db),
    findCategoryIdBySlug: (slug) => findCategoryIdBySlug(db, slug),
    listProducts: (query) => listProducts(db, query),
  });
}

export function relationsService(db: Db) {
  return createRelationsService({
    loadInputs: () => loadRelationInputs(db),
    replaceRelations: (edges) => replaceRelations(db, edges),
  });
}
