export { catalogRoutes } from './catalog.route';
export { createCatalogService, type CatalogService } from './catalog.service';
export {
  findCategoryBySlug,
  findProductBySlug,
  listAttributeDefs,
  listCategories,
  listedProductFacts,
  listProducts,
  listProductsByIds,
  loadFaqs,
  loadRatings,
  loadRelationsFrom,
  loadVariantStates,
} from './catalog.repository';
