import { createFileRoute, redirect } from '@tanstack/react-router';
import { SearchPage, searchResultsQuery } from '../features/search';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/search')({
  validateSearch: (raw: Record<string, unknown>): { q?: string } => {
    const q = typeof raw.q === 'string' ? raw.q.trim().slice(0, 100) : '';
    return q ? { q } : {};
  },
  loaderDeps: ({ search }) => ({ q: search.q ?? '' }),
  loader: async ({ context: { queryClient }, deps: { q } }) => {
    if (!q) return;
    const view = await queryClient.ensureQueryData(searchResultsQuery(q));
    // Exact model name, model number or SKU: straight to the product (D-110).
    if (view.exactMatch)
      throw redirect({
        to: '/products/$slug',
        params: { slug: view.exactMatch.slug },
        search: view.exactMatch.variant ? { variant: view.exactMatch.variant } : {},
      });
  },
  // Result pages are thin duplicates of category pages: never indexed (D-183).
  head: ({ match }) =>
    pageHead({
      title: match.search.q ? `“${match.search.q}”` : 'Search',
      noindex: true,
    }),
  component: SearchRoute,
});

function SearchRoute() {
  const { q } = Route.useSearch();
  return <SearchPage q={q ?? ''} />;
}
