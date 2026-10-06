import { createFileRoute } from '@tanstack/react-router';
import { HOME_NEWEST, HomePage, newestProductsQuery } from '../features/catalog';
import { liveOffersQuery, OfferStrip } from '../features/offers';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/')({
  head: () =>
    pageHead({
      title: 'Borneo',
      description:
        'Phones, audio, wearables, TVs and smart home, direct from Borneo. Real prices and delivery dates.',
      path: '/',
    }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.prefetchQuery(newestProductsQuery(HOME_NEWEST)),
      context.queryClient.prefetchQuery(liveOffersQuery),
    ]),
  component: () => <HomePage offers={<OfferStrip />} />,
});
