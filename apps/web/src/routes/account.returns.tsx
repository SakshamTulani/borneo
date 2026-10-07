import { createFileRoute } from '@tanstack/react-router';
import { returnsQuery, ReturnsPage } from '../features/orders';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/returns')({
  loader: ({ context: { queryClient } }) => queryClient.prefetchQuery(returnsQuery),
  head: () => pageHead({ title: 'Returns and replacements', noindex: true }),
  component: () => (
    <section aria-labelledby="returns-heading" className="space-y-5">
      <h2 id="returns-heading" className="font-heading text-tagline font-semibold">
        Returns and replacements
      </h2>
      <ReturnsPage />
    </section>
  ),
});
