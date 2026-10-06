import { createFileRoute, redirect } from '@tanstack/react-router';
import { sessionQuery } from '../features/auth';
import { PaymentPage } from '../features/checkout';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/checkout/$orderId/pay')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    if (!(await queryClient.ensureQueryData(sessionQuery)))
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
  },
  head: () => pageHead({ title: 'Payment', noindex: true }),
  component: PayRoute,
});

function PayRoute() {
  const { orderId } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <PaymentPage
      orderId={orderId}
      onConfirmed={() =>
        void navigate({ to: '/checkout/$orderId/done', params: { orderId }, replace: true })
      }
    />
  );
}
