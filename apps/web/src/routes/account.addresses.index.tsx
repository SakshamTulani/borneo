import { createFileRoute } from '@tanstack/react-router';
import { addressesQuery, AddressBookPage } from '../features/addresses';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/addresses/')({
  loader: ({ context: { queryClient } }) => queryClient.prefetchQuery(addressesQuery),
  head: () => pageHead({ title: 'Addresses', noindex: true }),
  component: AddressesRoute,
});

function AddressesRoute() {
  return (
    <section aria-labelledby="addresses-heading" className="space-y-5">
      <h2 id="addresses-heading" className="font-heading text-tagline font-semibold">
        Addresses
      </h2>
      <AddressBookPage />
    </section>
  );
}
