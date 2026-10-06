import { createFileRoute, redirect } from '@tanstack/react-router';
import { sessionQuery } from '../features/auth';
import { OrderConfirmedPage, orderQuery } from '../features/checkout';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/checkout/$orderId/done')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    if (!(await queryClient.ensureQueryData(sessionQuery)))
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
  },
  loader: ({ context: { queryClient }, params }) =>
    queryClient.prefetchQuery(orderQuery(params.orderId)),
  head: () => pageHead({ title: 'Order confirmed', noindex: true }),
  component: DoneRoute,
});

function DoneRoute() {
  const { orderId } = Route.useParams();
  return <OrderConfirmedPage orderId={orderId} />;
}
