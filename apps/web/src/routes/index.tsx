import { createFileRoute } from '@tanstack/react-router';
import { HOME_NEWEST, HomePage, newestProductsQuery, toCatalogCard } from '../features/catalog';
import { dealsQuery } from '../features/deals';
import { UpgradeStrip } from '../features/upgrade';
import { ProductCard } from '../shared/ui/commerce/ProductCard';
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
      context.queryClient.prefetchQuery(dealsQuery),
    ]),
  component: () => (
    <HomePage
      offers={<OfferStrip />}
      upgrades={
        <UpgradeStrip
          renderCard={({ to }) => {
            const { id: _id, slug, ...card } = toCatalogCard(to);
            void _id;
            return (
              <ProductCard
                {...card}
                badges={[{ kind: 'upgradeAvailable' }, ...(card.badges ?? [])]}
                link={{ to: '/products/$slug', params: { slug } }}
                className="w-full flex-1"
              />
            );
          }}
        />
      }
    />
  ),
});
