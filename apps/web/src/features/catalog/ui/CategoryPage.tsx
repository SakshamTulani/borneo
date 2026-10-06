import { useMemo } from 'react';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { useCategoryQuery } from '../hooks/useCategoryQuery';
import { useProductListQuery } from '../hooks/useProductListQuery';
import {
  priceOptions,
  toActiveFilters,
  toFilterControls,
  toListingParams,
} from '../mappers/listingSearch';
import type { ListingSearch } from '../model';
import { CategoryView, type CategoryViewProps } from './CategoryView';

type Props = {
  slug: string;
  search: ListingSearch;
  onSearchChange: (next: ListingSearch) => void;
};

/** Category page: config-driven filters in the URL (D-18), sorted, paged listing (D-19). */
export function CategoryPage({ slug, search, onSearchChange }: Props) {
  const categoryQuery = useCategoryQuery(slug);
  const detail = categoryQuery.data;
  const facets = useMemo(
    () => ({ filters: detail?.filters ?? [], priceCapsPaise: detail?.priceCapsPaise ?? [] }),
    [detail],
  );
  const params = useMemo(() => toListingParams(slug, search, facets), [slug, search, facets]);
  const products = useProductListQuery(params);

  if (categoryQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load this category"
        onRetry={() => void categoryQuery.refetch()}
        className="my-8"
      />
    );
  }
  if (!detail) {
    return categoryQuery.isPending ? null : (
      <EmptyState title="Category not found" className="my-8" />
    );
  }

  const list: CategoryViewProps['list'] = products.isPending
    ? { status: 'pending' }
    : products.isError
      ? { status: 'error', onRetry: () => void products.refetch() }
      : {
          status: 'success',
          cards: products.data.pages.flatMap((p) => p.cards),
          hasMore: products.hasNextPage,
          loadingMore: products.isFetchingNextPage,
          onLoadMore: () => void products.fetchNextPage(),
        };

  return (
    <CategoryView
      category={detail.category}
      controls={toFilterControls(facets.filters, search)}
      priceOptions={priceOptions(facets.priceCapsPaise)}
      activeFilters={toActiveFilters(facets, search)}
      search={search}
      onSearchChange={onSearchChange}
      list={list}
    />
  );
}
