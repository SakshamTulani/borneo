import { createFileRoute } from '@tanstack/react-router';
import { addressesQuery, AddressFormPage } from '../features/addresses';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/addresses/new')({
  loader: ({ context: { queryClient } }) => queryClient.prefetchQuery(addressesQuery),
  head: () => pageHead({ title: 'Add an address', noindex: true }),
  component: NewAddressRoute,
});

function NewAddressRoute() {
  const navigate = Route.useNavigate();
  return (
    <section aria-labelledby="new-address" className="max-w-2xl space-y-5">
      <h2 id="new-address" className="font-heading text-tagline font-semibold">
        Add an address
      </h2>
      <AddressFormPage onSaved={() => void navigate({ to: '/account/addresses' })} />
    </section>
  );
}
