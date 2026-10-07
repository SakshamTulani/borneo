import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, SearchXIcon } from 'lucide-react';
import { Button } from '@/shared/ui/base/button';
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Container } from '@/shared/ui/layout/Container';
import { useSearchResultsQuery } from '../hooks/useSearchResultsQuery';
import type { SearchCategoryLink, SearchView } from '../model';
import { SearchBox } from './SearchBox';

const chip =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-sm outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand';

function CategoryChips({ categories, label }: { categories: SearchCategoryLink[]; label: string }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label={label}>
      {categories.map((c) => (
        <li key={c.slug}>
          <Link to="/categories/$slug" params={{ slug: c.slug }} className={chip}>
            {c.name}
            <ArrowRightIcon className="size-3.5 text-brand" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** No results (D-114): alternatives from the named category, categories, "browse all". No capture form. */
function NoResults({ view }: { view: SearchView }) {
  const fallback = view.fallback;
  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-surface px-6 py-12 text-center">
        <SearchXIcon className="size-8 text-ink-muted" aria-hidden />
        <h2 className="font-heading text-headline tracking-tight">
          {view.interpretation
            ? `No ${view.interpretation.label.toLowerCase()} right now`
            : `No results for “${view.query}”`}
        </h2>
        <p className="max-w-md text-ink-muted">
          Check the spelling, try a model name like “Pulse 4”, or browse a category.
        </p>
        <Link
          to="/categories"
          className="inline-flex min-h-11 items-center gap-1 text-brand hover:underline"
        >
          Browse all categories
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </div>
      {fallback?.cards.length ? (
        <section aria-labelledby="search-alternatives" className="space-y-4">
          <h2 id="search-alternatives" className="font-heading text-headline tracking-tight">
            {view.interpretation?.category
              ? `${view.interpretation.category.name} you can buy today`
              : 'Other options'}
          </h2>
          <ProductGrid cards={fallback.cards} />
        </section>
      ) : null}
      {fallback?.categories.length ? (
        <section aria-labelledby="search-popular" className="space-y-4">
          <h2 id="search-popular" className="font-heading text-headline tracking-tight">
            Popular categories
          </h2>
          <CategoryChips categories={fallback.categories} label="Popular categories" />
        </section>
      ) : null}
    </div>
  );
}

function Results({ q }: { q: string }) {
  const results = useSearchResultsQuery(q);
  if (results.isPending) return <ProductGridSkeleton count={8} />;
  if (results.isError)
    return (
      <ErrorState title="Search isn't working right now" onRetry={() => void results.refetch()} />
    );
  const view = results.data.pages[0]!;
  const cards = results.data.pages.flatMap((p) => p.cards);
  const count = view.total;
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="font-heading text-[2rem] leading-tight tracking-tight sm:text-title">
          Results for “{view.query}”
        </h1>
        {count ? (
          <p className="text-ink-muted" role="status">
            {count} product{count === 1 ? '' : 's'}
            {view.interpretation ? ` · ${view.interpretation.label}` : ''}
          </p>
        ) : null}
        {view.interpretation?.category && count ? (
          <Link
            to="/categories/$slug"
            params={{ slug: view.interpretation.category.slug }}
            search={
              view.interpretation.category.maxPrice !== undefined
                ? { maxPrice: view.interpretation.category.maxPrice }
                : {}
            }
            className="inline-flex min-h-11 items-center gap-1 text-brand hover:underline"
          >
            Refine with all filters
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        ) : view.categories.length && count ? (
          <CategoryChips categories={view.categories} label="Matching categories" />
        ) : null}
      </div>
      {count ? (
        <section aria-labelledby="search-products">
          <h2 id="search-products" className="sr-only">
            Products
          </h2>
          <ProductGrid cards={cards} eager={4} />
          {results.hasNextPage ? (
            <div className="flex flex-col items-center gap-2 pt-6">
              <p className="text-sm text-ink-muted">
                Showing {cards.length} of {view.total}
              </p>
              <Button
                variant="outline"
                loading={results.isFetchingNextPage}
                onClick={() => void results.fetchNextPage()}
              >
                Show more results
              </Button>
            </div>
          ) : null}
        </section>
      ) : (
        <NoResults view={view} />
      )}
    </div>
  );
}

/** `/search?q=` (D-110–114). Exact matches never get here: the route opens the product. */
export function SearchPage({ q }: { q: string }) {
  return (
    <Container className="space-y-8 pt-6 pb-10">
      {q ? (
        <Results q={q} />
      ) : (
        // Landing from the mobile Search tab: one big box, ready to type.
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="font-heading text-[2rem] leading-tight tracking-tight sm:text-title">
            Search
          </h1>
          <SearchBox autoFocus />
          <p className="text-sm text-ink-muted">
            Try a model (“Pulse 4”), a SKU, or “phone under 30000”.
          </p>
        </div>
      )}
    </Container>
  );
}
