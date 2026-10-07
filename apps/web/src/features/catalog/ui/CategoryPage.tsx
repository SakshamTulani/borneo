import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { SparklesIcon } from 'lucide-react';
import { COMPARE_MAX, toggleCompare } from '@borneo/shared';
import { buttonVariants } from '@/shared/ui/base/button';
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
  const [compareMessage, setCompareMessage] = useState<string | null>(null);

  if (categoryQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load this category"
        onRetry={() => void categoryQuery.refetch()}
        className="mx-4 my-10 sm:mx-6"
      />
    );
  }
  if (!detail) {
    return categoryQuery.isPending ? null : (
      <EmptyState title="Category not found" className="mx-4 my-10 sm:mx-6" />
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

  const selected = String(search.compare ?? '')
    .split(',')
    .filter(Boolean)
    .slice(0, COMPARE_MAX);
  const setSelection = (next: string[]) => {
    const { compare: _drop, ...rest } = search;
    void _drop;
    onSearchChange(next.length ? { ...rest, compare: next.join(',') } : rest);
  };
  const config = detail.category.config;
  const compare = config.compare.length
    ? {
        selected,
        message: compareMessage,
        onClear: () => {
          setCompareMessage(null);
          setSelection([]);
        },
        onToggle: (slug: string) => {
          const r = toggleCompare(selected, slug);
          setCompareMessage(
            r.refused ? `You can compare up to ${COMPARE_MAX}. Remove one to add another.` : null,
          );
          if (!r.refused) setSelection(r.selection);
        },
      }
    : undefined;
  const guide =
    config.finder || config.explainers?.length ? (
      <section aria-labelledby="guide" className="mt-12 space-y-5 rounded-xl bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="guide" className="font-heading text-tagline font-semibold">
            Choosing {detail.category.name.toLowerCase()}
          </h2>
          {config.finder ? (
            <Link
              to="/finder/$id"
              params={{ id: config.finder }}
              className={buttonVariants({ variant: 'outline' })}
            >
              <SparklesIcon aria-hidden />
              Help me choose
            </Link>
          ) : null}
        </div>
        {config.explainers?.length ? (
          <dl className="grid gap-5 sm:grid-cols-2">
            {config.explainers.map((e) => (
              <div key={e.title}>
                <dt className="font-semibold">{e.title}</dt>
                <dd className="text-[15px] text-ink-muted">{e.body}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>
    ) : null;

  return (
    <CategoryView
      compare={compare}
      guide={guide}
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
