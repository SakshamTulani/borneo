import { createFileRoute } from '@tanstack/react-router';
import { inboxQuery, InboxPage } from '../features/notifications';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/inbox')({
  loader: ({ context: { queryClient } }) => queryClient.prefetchInfiniteQuery(inboxQuery),
  head: () => pageHead({ title: 'Inbox', noindex: true }),
  component: InboxRoute,
});

function InboxRoute() {
  return (
    <section aria-labelledby="inbox-heading" className="space-y-5">
      <h2 id="inbox-heading" className="font-heading text-tagline font-semibold">
        Inbox
      </h2>
      <InboxPage />
    </section>
  );
}
