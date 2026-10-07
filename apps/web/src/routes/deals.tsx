import { createFileRoute } from '@tanstack/react-router';
import { dealsQuery, DealsPage } from '../features/deals';
import { liveOffersQuery, OfferList } from '../features/offers';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/deals')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.prefetchQuery(dealsQuery),
      queryClient.prefetchQuery(liveOffersQuery),
    ]),
  head: () =>
    pageHead({
      title: 'Deals',
      description: 'Flash sales with real end times and stock, bank offers and coupons at Borneo.',
      path: '/deals',
    }),
  component: () => <DealsPage offers={<OfferList />} />,
});
