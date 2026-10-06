import { createFileRoute } from '@tanstack/react-router';
import { ApiStatus, apiStatusQuery } from '../features/health';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/')({
  head: () =>
    pageHead({ title: 'Borneo', description: 'Electronics and smart home, direct from Borneo.' }),
  loader: ({ context }) => context.queryClient.prefetchQuery(apiStatusQuery),
  component: () => (
    <section className="py-8">
      <h1 className="text-3xl font-bold">Borneo</h1>
      <ApiStatus />
    </section>
  ),
});
