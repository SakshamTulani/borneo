import { createFileRoute } from '@tanstack/react-router';
import { devicesQuery, DevicesPage } from '../features/account';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/devices')({
  loader: ({ context: { queryClient } }) => queryClient.prefetchQuery(devicesQuery),
  head: () => pageHead({ title: 'My devices', noindex: true }),
  component: () => (
    <section aria-labelledby="devices-heading" className="space-y-5">
      <h2 id="devices-heading" className="font-heading text-tagline font-semibold">
        My devices
      </h2>
      <DevicesPage />
    </section>
  ),
});
