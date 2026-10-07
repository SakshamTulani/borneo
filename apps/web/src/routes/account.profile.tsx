import { createFileRoute } from '@tanstack/react-router';
import { ProfilePage } from '../features/account';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/profile')({
  head: () => pageHead({ title: 'Profile and security', noindex: true }),
  component: () => (
    <section aria-labelledby="profile-heading" className="space-y-5">
      <h2 id="profile-heading" className="font-heading text-tagline font-semibold">
        Profile and security
      </h2>
      <ProfilePage />
    </section>
  ),
});
