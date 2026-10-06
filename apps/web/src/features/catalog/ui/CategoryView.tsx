import { Link } from '@tanstack/react-router';
import { SlidersHorizontalIcon, XIcon } from 'lucide-react';
import { useId, useState } from 'react';
import type { ProductSort } from '@borneo/shared';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/base/button';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Breadcrumbs } from '@/shared/ui/navigation/Breadcrumbs';
import { clearFilters } from '../mappers/listingSearch';
import type { ActiveFilter, CatalogCard, FilterControl, ListingSearch } from '../model';
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
  list:
    | { status: 'pending' }
    | { status: 'error'; onRetry: () => void }
    | {
        status: 'success';
        cards: CatalogCard[];
        hasMore: boolean;
        loadingMore: boolean;
        onLoadMore: () => void;
      };
};

export function CategoryView(props: CategoryViewProps) {
  const { category, controls, priceOptions, activeFilters, search, onSearchChange, list } = props;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelId = useId();
  const sortId = useId();
  const hasFilters = controls.length > 0 || priceOptions.length > 0;

  return (
    <div className="space-y-4 py-4">
      <Breadcrumbs
        items={[
          { key: 'home', node: <Link to="/">Home</Link> },
          { key: category.slug, node: category.name },
        ]}
      />
      <h1 className="font-heading text-3xl font-bold">{category.name}</h1>

      <div className="flex flex-wrap items-end justify-between gap-3">
        {hasFilters ? (
          <Button
            variant="outline"
            className="lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls={panelId}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <SlidersHorizontalIcon aria-hidden />
            Filters{activeFilters.length ? ` (${activeFilters.length})` : ''}
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor={sortId} className="text-sm text-ink-muted">
            Sort by
          </label>
          <select
            id={sortId}
            value={search.sort ?? 'newest'}
            onChange={(e) =>
              onSearchChange({
                ...search,
                sort: e.target.value === 'newest' ? undefined : (e.target.value as ProductSort),
              })
            }
            className="h-11 rounded-md border border-line-strong bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeFilters.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Applied filters">
          {activeFilters.map((f) => (
            <li key={f.key}>
              <Button
                variant="secondary"
                className="h-11 rounded-full"
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

      <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8">
        {hasFilters ? (
          <section
            id={panelId}
            aria-labelledby={`${panelId}-h`}
            className={cn(
              'mb-4 rounded-xl border border-line bg-surface p-4 lg:mb-0 lg:block lg:self-start',
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
        <section aria-labelledby={`${panelId}-products`} className="min-w-0 lg:col-start-2">
          <h2 id={`${panelId}-products`} className="sr-only">
            Products
          </h2>
          <Results
            list={list}
            filtered={activeFilters.length > 0}
            onClear={() => onSearchChange(clearFilters(search))}
          />
        </section>
      </div>
    </div>
  );
}

function Results({
  list,
  filtered,
  onClear,
}: {
  list: CategoryViewProps['list'];
  filtered: boolean;
  onClear: () => void;
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
    <div className="space-y-6">
      <p role="status" className="text-sm text-ink-muted">
        Showing {list.cards.length} product{list.cards.length === 1 ? '' : 's'}
      </p>
      <ProductGrid cards={list.cards} />
      {list.hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" loading={list.loadingMore} onClick={list.onLoadMore}>
            Show more products
          </Button>
        </div>
      ) : null}
    </div>
  );
}
