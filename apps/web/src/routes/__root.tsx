import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { AccountLink, sessionQuery } from '../features/auth';
import { useCartCountQuery } from '../features/cart';
import { categoriesQuery, CategoryNav, FooterCategories } from '../features/catalog';
import { SearchBox } from '../features/search';
import appCss from '../index.css?url';
import { pageHead } from '../shared/lib/seo';
import { AppShell } from '../shared/ui/AppShell';
import { EmptyState } from '../shared/ui/feedback/EmptyState';
import { ErrorState } from '../shared/ui/feedback/ErrorState';
import { Container } from '../shared/ui/layout/Container';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const base = pageHead({ title: 'Borneo' });
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        ...base.meta,
      ],
      links: [{ rel: 'stylesheet', href: appCss }],
    };
  },
  // Header navigation lists categories and the account link on every page; SSR forwards the cookie.
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.prefetchQuery(categoriesQuery),
      context.queryClient.prefetchQuery(sessionQuery),
    ]),
  shellComponent: RootDocument,
  errorComponent: ({ reset }) => (
    <AppShell>
      <Container className="py-10">
        <ErrorState title="Something went wrong" body="Please try again." onRetry={reset} />
      </Container>
    </AppShell>
  ),
  notFoundComponent: () => (
    <Container className="py-10">
      <EmptyState title="Page not found" body="The page you're looking for doesn't exist." />
    </Container>
  ),
  component: RootLayout,
});

function RootLayout() {
  const cartCount = useCartCountQuery().data;
  return (
    <AppShell
      nav={<CategoryNav />}
      search={<SearchBox />}
      account={<AccountLink />}
      cartCount={cartCount}
      footerCategories={<FooterCategories />}
    >
      <Outlet />
    </AppShell>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
