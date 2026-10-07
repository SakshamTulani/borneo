import { createFileRoute } from '@tanstack/react-router';
import { orderDetailQuery, OrderDetailPage } from '../features/orders';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/orders/$orderId')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.prefetchQuery(orderDetailQuery(params.orderId)),
  head: () => pageHead({ title: 'Order', noindex: true }),
  component: OrderRoute,
});

function OrderRoute() {
  const { orderId } = Route.useParams();
  return <OrderDetailPage orderId={orderId} />;
}
