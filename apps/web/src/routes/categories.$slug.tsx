import { createFileRoute, notFound } from '@tanstack/react-router';
import {
  CategoryPage,
  categoryQuery,
  parseListingSearch,
  productListQuery,
  toListingParams,
} from '../features/catalog';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/categories/$slug')({
  // Filters and sort live in the URL (D-18).
  validateSearch: (raw: Record<string, unknown>) => parseListingSearch(raw),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context: { queryClient }, params, deps }) => {
    const detail = await queryClient.ensureQueryData(categoryQuery(params.slug));
    if (!detail) throw notFound();
    await queryClient.prefetchInfiniteQuery(
      productListQuery(toListingParams(params.slug, deps.search, detail)),
    );
    return { name: detail.category.name };
  },
  // Filtered views share the category's canonical URL.
  head: ({ loaderData, params }) =>
    pageHead({
      title: loaderData?.name ?? 'Category',
      description: loaderData
        ? `Shop Borneo ${loaderData.name.toLowerCase()}: compare specs, prices and offers.`
        : undefined,
      path: `/categories/${params.slug}`,
    }),
  component: CategoryRoute,
});

function CategoryRoute() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CategoryPage
      slug={slug}
      search={search}
      onSearchChange={(next) => void navigate({ search: next, resetScroll: false })}
    />
  );
}
