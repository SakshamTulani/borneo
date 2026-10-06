import { createFileRoute } from '@tanstack/react-router';
import { checkoutQuerySchema } from '@borneo/shared';
import { CheckoutPage, type CheckoutChoice } from '../features/checkout';
import { pageHead } from '../shared/lib/seo';

// Signed out, the page makes the account (D-92), so there is no sign-in guard. Choices live in
// the URL: a refresh or an address change keeps them and rechecks everything (D-55).
export const Route = createFileRoute('/checkout/')({
  validateSearch: (raw: Record<string, unknown>): CheckoutChoice => {
    const parsed = checkoutQuerySchema.safeParse(raw);
    return parsed.success ? parsed.data : {};
  },
  head: () => pageHead({ title: 'Checkout', noindex: true }),
  component: CheckoutRoute,
});

function CheckoutRoute() {
  const choice = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CheckoutPage
      choice={choice}
      onChoice={(next) =>
        void navigate({
          search: (prev) =>
            Object.fromEntries(
              Object.entries({ ...prev, ...next }).filter(([, v]) => v !== undefined),
            ),
          replace: true,
          resetScroll: false,
        })
      }
      onPlaced={(order) =>
        void navigate(
          order.status === 'pending_payment'
            ? { to: '/checkout/$orderId/pay', params: { orderId: order.id } }
            : { to: '/checkout/$orderId/done', params: { orderId: order.id } },
        )
      }
    />
  );
}
