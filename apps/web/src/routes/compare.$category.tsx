import { createFileRoute } from '@tanstack/react-router';
import { compareQuery, ComparePage, parseCompareSearch } from '../features/compare';
import { pageHead } from '../shared/lib/seo';

const slugsOf = (p: string) => p.split(',').filter(Boolean);

export const Route = createFileRoute('/compare/$category')({
  // The selection lives in the URL (D-227); comparisons are not indexed.
  validateSearch: (raw: Record<string, unknown>) => parseCompareSearch(raw),
  loaderDeps: ({ search }) => ({ p: search.p }),
  loader: ({ context: { queryClient }, params, deps }) =>
    queryClient.prefetchQuery(compareQuery(params.category, slugsOf(deps.p))),
  head: () => pageHead({ title: 'Compare', noindex: true }),
  component: CompareRoute,
});

function CompareRoute() {
  const { category } = Route.useParams();
  const { p } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ComparePage
      category={category}
      slugs={slugsOf(p)}
      onChange={(next) => void navigate({ search: { p: next.join(',') }, replace: true })}
    />
  );
}
