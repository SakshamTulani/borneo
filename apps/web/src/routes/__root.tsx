import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import appCss from '../index.css?url';
import { pageHead } from '../shared/lib/seo';
import { AppShell } from '../shared/ui/AppShell';
import { EmptyState } from '../shared/ui/feedback/EmptyState';
import { ErrorState } from '../shared/ui/feedback/ErrorState';

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
  shellComponent: RootDocument,
  errorComponent: ({ reset }) => (
    <AppShell>
      <ErrorState
        title="Something went wrong"
        body="Please try again."
        onRetry={reset}
        className="my-8"
      />
    </AppShell>
  ),
  notFoundComponent: () => (
    <EmptyState
      title="Page not found"
      body="The page you're looking for doesn't exist."
      className="my-8"
    />
  ),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

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
