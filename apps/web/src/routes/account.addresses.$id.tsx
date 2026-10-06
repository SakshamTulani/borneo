import { createFileRoute } from '@tanstack/react-router';
import { addressesQuery, AddressFormPage } from '../features/addresses';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/addresses/$id')({
  loader: ({ context: { queryClient } }) => queryClient.prefetchQuery(addressesQuery),
  head: () => pageHead({ title: 'Edit address', noindex: true }),
  component: EditAddressRoute,
});

function EditAddressRoute() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <section aria-labelledby="edit-address" className="max-w-2xl space-y-5">
      <h2 id="edit-address" className="font-heading text-tagline font-semibold">
        Edit address
      </h2>
      <AddressFormPage id={id} onSaved={() => void navigate({ to: '/account/addresses' })} />
    </section>
  );
}
