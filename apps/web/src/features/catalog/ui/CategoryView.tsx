import { Link } from '@tanstack/react-router';
import { SlidersHorizontalIcon, XIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import type { ProductSort } from '@borneo/shared';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/base/button';
import { Select } from '@/shared/ui/base/select';
import { Container } from '@/shared/ui/layout/Container';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Breadcrumbs } from '@/shared/ui/navigation/Breadcrumbs';
import { clearFilters } from '../mappers/listingSearch';
import type {
  ActiveFilter,
  CatalogCard,
  CompareControl,
  FilterControl,
  ListingSearch,
} from '../model';
import { CompareTray } from './CompareTray';
import { FilterPanel } from './FilterPanel';
import { ProductGrid, ProductGridSkeleton } from './ProductGrid';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export type CategoryViewProps = {
  category: { slug: string; name: string };
  controls: FilterControl[];
  priceOptions: { value: string; label: string }[];
  activeFilters: ActiveFilter[];
  search: ListingSearch;
  onSearchChange: (next: ListingSearch) => void;
  /** Compare selection, for categories with compare rows (D-227). */
  compare?: CompareControl | undefined;
  /** Finder link and explainers, below the listing (D-225, D-228). */
  guide?: ReactNode;
  list:
    | { status: 'pending' }
    | { status: 'error'; onRetry: () => void }
    | {
        status: 'success';
        cards: CatalogCard[];
        /** Matches across all pages. */
        total?: number;
        hasMore: boolean;
        loadingMore: boolean;
        onLoadMore: () => void;
      };
};

export function CategoryView(props: CategoryViewProps) {
  const {
    category,
    controls,
    priceOptions,
    activeFilters,
    search,
    onSearchChange,
    list,
    compare,
    guide,
  } = props;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelId = useId();
  const sortId = useId();
  const hasFilters = controls.length > 0 || priceOptions.length > 0;

  return (
    <Container className="space-y-5 pt-2 pb-8">
      <Breadcrumbs
        items={[
          { key: 'home', node: <Link to="/">Home</Link> },
          { key: category.slug, node: category.name },
        ]}
      />
      <h1 className="font-heading text-title tracking-tight">{category.name}</h1>

      <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-10">
        <div className="mb-4 space-y-3 lg:col-start-2 lg:row-start-1">
          <div className="flex flex-wrap items-center gap-3">
            {hasFilters ? (
              <Button
                variant="secondary"
                className="lg:hidden"
                aria-expanded={filtersOpen}
                aria-controls={panelId}
                onClick={() => setFiltersOpen((o) => !o)}
              >
                <SlidersHorizontalIcon aria-hidden />
                Filters{activeFilters.length ? ` (${activeFilters.length})` : ''}
              </Button>
            ) : null}
            {list.status === 'success' && list.cards.length ? (
              <p role="status" className="sr-only text-sm text-ink-muted sm:not-sr-only">
                Showing {list.cards.length}
                {list.total && list.total > list.cards.length ? ` of ${list.total}` : ''} product
                {(list.total ?? list.cards.length) === 1 ? '' : 's'}
              </p>
            ) : null}
            <div className="ml-auto flex items-center gap-3">
              <span
                aria-hidden
                className="hidden text-sm whitespace-nowrap text-ink-muted sm:block"
              >
                Sort by
              </span>
              <Select
                id={sortId}
                aria-label="Sort by"
                className="w-48"
                value={search.sort ?? 'newest'}
                onChange={(e) =>
                  onSearchChange({
                    ...search,
                    sort: e.target.value === 'newest' ? undefined : (e.target.value as ProductSort),
                  })
                }
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {activeFilters.length ? (
            <ul className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
              {activeFilters.map((f) => (
                <li key={f.key}>
                  <Button
                    variant="secondary"
                    className="px-4 text-sm"
                    onClick={() => onSearchChange(f.remove)}
                    aria-label={`Remove filter ${f.label}`}
                  >
                    {f.label}
                    <XIcon aria-hidden />
                  </Button>
                </li>
              ))}
              <li>
                <Button variant="link" onClick={() => onSearchChange(clearFilters(search))}>
                  Clear all
                </Button>
              </li>
            </ul>
          ) : null}
        </div>
        {hasFilters ? (
          <section
            id={panelId}
            aria-labelledby={`${panelId}-h`}
            className={cn(
              'mb-4 rounded-xl bg-surface p-5 lg:sticky lg:top-32 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mb-0 lg:block lg:self-start lg:bg-transparent lg:p-0',
              filtersOpen ? 'block' : 'hidden',
            )}
          >
            <h2 id={`${panelId}-h`} className="sr-only">
              Filters
            </h2>
            <FilterPanel
              controls={controls}
              priceOptions={priceOptions}
              search={search}
              onSearchChange={onSearchChange}
            />
          </section>
        ) : null}
        <section
          aria-labelledby={`${panelId}-products`}
          className="min-w-0 lg:col-start-2 lg:row-start-2"
        >
          <h2 id={`${panelId}-products`} className="sr-only">
            Products
          </h2>
          <Results
            list={list}
            filtered={activeFilters.length > 0}
            onClear={() => onSearchChange(clearFilters(search))}
            compare={compare}
          />
        </section>
      </div>
      {guide}
      {compare && compare.selected.length ? (
        <CompareTray categorySlug={category.slug} compare={compare} />
      ) : null}
    </Container>
  );
}

function Results({
  list,
  filtered,
  onClear,
  compare,
}: {
  list: CategoryViewProps['list'];
  filtered: boolean;
  onClear: () => void;
  compare?: CompareControl | undefined;
}) {
  if (list.status === 'pending') return <ProductGridSkeleton />;
  if (list.status === 'error') {
    return (
      <ErrorState
        title="Couldn't load products"
        body="Please check your connection and try again."
        onRetry={list.onRetry}
      />
    );
  }
  if (list.cards.length === 0) {
    return filtered ? (
      <EmptyState
        title="No products match these filters"
        body="Try removing a filter."
        action={<Button onClick={onClear}>Clear filters</Button>}
      />
    ) : (
      <EmptyState title="Nothing here yet" body="Products in this category are on their way." />
    );
  }
  return (
    <div className="space-y-4">
      <ProductGrid cards={list.cards} eager={4} compare={compare} />
      {list.hasMore ? (
        <div className="flex justify-center pt-4">
          <Button variant="outline" loading={list.loadingMore} onClick={list.onLoadMore}>
            Show more products
            {list.total ? ` (${list.total - list.cards.length} more)` : ''}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
