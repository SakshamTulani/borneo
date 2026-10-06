import { createFileRoute } from '@tanstack/react-router';
import { ForgotPasswordPage, parseAuthSearch } from '../features/auth';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/forgot-password')({
  validateSearch: parseAuthSearch,
  head: () => pageHead({ title: 'Reset your password', noindex: true }),
  component: ForgotPasswordRoute,
});

function ForgotPasswordRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ForgotPasswordPage
      {...(search.email ? { email: search.email } : {})}
      {...(search.redirect ? { redirect: search.redirect } : {})}
      onReset={(email) =>
        void navigate({
          to: '/sign-in',
          search: { email, reset: true, ...(search.redirect ? { redirect: search.redirect } : {}) },
        })
      }
    />
  );
}
