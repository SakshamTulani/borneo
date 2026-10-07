import { createFileRoute } from '@tanstack/react-router';
import { ordersQuery, OrdersPage } from '../features/orders';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/orders/')({
  loader: ({ context: { queryClient } }) => queryClient.prefetchInfiniteQuery(ordersQuery),
  head: () => pageHead({ title: 'Orders', noindex: true }),
  component: OrdersRoute,
});

function OrdersRoute() {
  return (
    <section aria-labelledby="orders-heading" className="space-y-5">
      <h2 id="orders-heading" className="font-heading text-tagline font-semibold">
        Orders
      </h2>
      <OrdersPage />
    </section>
  );
}
