import { createFileRoute, Outlet, redirect, useRouter } from '@tanstack/react-router';
import { AccountLayout } from '../features/account';
import { sessionQuery } from '../features/auth';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account')({
  // Signed-out visitors sign in first, then come back here (D-90).
  beforeLoad: async ({ context: { queryClient }, location }) => {
    if (!(await queryClient.ensureQueryData(sessionQuery))) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }
  },
  head: () => pageHead({ title: 'Your account', noindex: true }),
  component: AccountRoute,
});

function AccountRoute() {
  const router = useRouter();
  return (
    <AccountLayout onSignedOut={() => void router.navigate({ to: '/' })}>
      <Outlet />
    </AccountLayout>
  );
}
