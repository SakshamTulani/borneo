import { createFileRoute } from '@tanstack/react-router';
import { AccountOverview, summaryQuery } from '../features/account';
import { ordersQuery } from '../features/orders';
import { myReviewsQuery } from '../features/reviews';

export const Route = createFileRoute('/account/')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.prefetchQuery(summaryQuery),
      queryClient.prefetchInfiniteQuery(ordersQuery),
      queryClient.prefetchInfiniteQuery(myReviewsQuery),
    ]),
  component: AccountOverview,
});
