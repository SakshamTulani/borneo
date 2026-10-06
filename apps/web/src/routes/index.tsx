import { createFileRoute } from '@tanstack/react-router';
import { HOME_NEWEST, HomePage, newestProductsQuery } from '../features/catalog';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/')({
  head: () =>
    pageHead({
      title: 'Borneo',
      description:
        'Phones, audio, wearables, TVs and smart home, direct from Borneo. Real prices and delivery dates.',
      path: '/',
    }),
  loader: ({ context }) => context.queryClient.prefetchQuery(newestProductsQuery(HOME_NEWEST)),
  component: HomePage,
});
