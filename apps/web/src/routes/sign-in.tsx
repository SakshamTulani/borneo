import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { afterSignIn, parseAuthSearch, sessionQuery, SignInPage } from '../features/auth';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/sign-in')({
  validateSearch: parseAuthSearch,
  beforeLoad: async ({ context: { queryClient }, search }) => {
    if (await queryClient.ensureQueryData(sessionQuery))
      throw redirect({ href: afterSignIn(search) });
  },
  head: () => pageHead({ title: 'Sign in', noindex: true }),
  component: SignInRoute,
});

function SignInRoute() {
  const search = Route.useSearch();
  const router = useRouter();
  return (
    <SignInPage
      {...search}
      passwordReset={search.reset === true}
      onSignedIn={() => router.history.push(afterSignIn(search))}
    />
  );
}
