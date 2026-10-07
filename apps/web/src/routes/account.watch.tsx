import { createFileRoute } from '@tanstack/react-router';
import { watchQuery, WatchPage } from '../features/watch';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/watch')({
  loader: ({ context: { queryClient } }) => queryClient.prefetchQuery(watchQuery),
  head: () => pageHead({ title: 'Watch list', noindex: true }),
  component: () => (
    <section aria-labelledby="watch-heading" className="space-y-5">
      <h2 id="watch-heading" className="font-heading text-tagline font-semibold">
        Watch list
      </h2>
      <WatchPage />
    </section>
  ),
});
