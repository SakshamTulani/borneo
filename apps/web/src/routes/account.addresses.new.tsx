import { createFileRoute } from '@tanstack/react-router';
import { addressesQuery, AddressFormPage } from '../features/addresses';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/addresses/new')({
  // From checkout: go back there once saved.
  validateSearch: (raw: Record<string, unknown>): { next?: 'checkout' } =>
    raw.next === 'checkout' ? { next: 'checkout' } : {},
  loader: ({ context: { queryClient } }) => queryClient.prefetchQuery(addressesQuery),
  head: () => pageHead({ title: 'Add an address', noindex: true }),
  component: NewAddressRoute,
});

function NewAddressRoute() {
  const navigate = Route.useNavigate();
  const { next } = Route.useSearch();
  return (
    <section aria-labelledby="new-address" className="max-w-2xl space-y-5">
      <h2 id="new-address" className="font-heading text-tagline font-semibold">
        Add an address
      </h2>
      <AddressFormPage
        onSaved={() =>
          void navigate({ to: next === 'checkout' ? '/checkout' : '/account/addresses' })
        }
      />
    </section>
  );
}
