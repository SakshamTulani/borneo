import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { getCategories, getCategory, getProducts } from '../api/catalogApi';
import { toCatalogCard } from '../mappers/toCatalogCard';
import type { CatalogCard, CategoryLink } from '../model';

export const PAGE_SIZE = 24;

export const categoriesQuery = queryOptions({
  queryKey: ['categories'],
  queryFn: async (): Promise<CategoryLink[]> =>
    (await getCategories()).map(({ slug, name, config }) => ({
      slug,
      name,
      ...(config.homeEntry ? { homeEntry: config.homeEntry } : {}),
      ...(config.finder ? { finder: config.finder } : {}),
    })),
  staleTime: 5 * 60_000,
});

/** Category with its filter facets; data is null for an unknown slug. */
export const categoryQuery = (slug: string) =>
  queryOptions({
    queryKey: ['category', slug],
    queryFn: () => getCategory(slug),
    staleTime: 60_000,
  });

/** Pages of product cards for API query params (from `toListingParams`). */
export const productListQuery = (params: Record<string, string>) =>
  infiniteQueryOptions({
    queryKey: ['products', params],
    queryFn: async ({
      pageParam,
    }): Promise<{ cards: CatalogCard[]; nextCursor: string | null; total: number }> => {
      const page = await getProducts({
        ...params,
        limit: String(PAGE_SIZE),
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      return {
        cards: page.items.map(toCatalogCard),
        nextCursor: page.nextCursor,
        total: page.total,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

/** Newest products across the catalog (home page, D-19). */
export const newestProductsQuery = (limit: number) =>
  queryOptions({
    queryKey: ['products', 'newest', limit],
    queryFn: async () =>
      (await getProducts({ sort: 'newest', limit: String(limit) })).items.map(toCatalogCard),
  });
