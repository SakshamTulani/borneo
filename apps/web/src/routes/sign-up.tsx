import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { afterSignIn, parseAuthSearch, sessionQuery, SignUpPage } from '../features/auth';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/sign-up')({
  validateSearch: parseAuthSearch,
  beforeLoad: async ({ context: { queryClient }, search }) => {
    if (await queryClient.ensureQueryData(sessionQuery))
      throw redirect({ href: afterSignIn(search) });
  },
  head: () => pageHead({ title: 'Create your account', noindex: true }),
  component: SignUpRoute,
});

function SignUpRoute() {
  const search = Route.useSearch();
  const router = useRouter();
  return (
    <SignUpPage
      {...(search.redirect ? { redirect: search.redirect } : {})}
      onSignedUp={() => router.history.push(afterSignIn(search))}
    />
  );
}
