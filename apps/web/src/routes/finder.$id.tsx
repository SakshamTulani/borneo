import { createFileRoute, notFound } from '@tanstack/react-router';
import { finderQuery, FinderPage, parseFinderSearch } from '../features/finder';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/finder/$id')({
  // Answers live in the URL (D-225); a shared link opens at the same step.
  validateSearch: (raw: Record<string, unknown>) => parseFinderSearch(raw),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context: { queryClient }, params, deps }) => {
    const view = await queryClient
      .ensureQueryData(finderQuery(params.id, deps.search))
      .catch(() => null);
    if (!view) throw notFound();
    return { title: view.title, category: view.category.name };
  },
  head: ({ loaderData, params }) =>
    pageHead({
      title: loaderData?.title ?? 'Help me choose',
      description: loaderData
        ? `Answer three questions and see which Borneo ${loaderData.category.toLowerCase()} fit you, and why.`
        : undefined,
      path: `/finder/${params.id}`,
    }),
  component: FinderRoute,
});

function FinderRoute() {
  const { id } = Route.useParams();
  const answers = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <FinderPage
      id={id}
      answers={answers}
      onAnswersChange={(next) => void navigate({ search: next, resetScroll: false })}
    />
  );
}
