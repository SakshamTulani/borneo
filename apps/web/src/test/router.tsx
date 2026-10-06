import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';

/**
 * Renders `ui` inside a real router (and a QueryClient) so Links, active states and navigation
 * work. Every path matches; `path` sets the current URL.
 */
export async function renderWithRouter(
  ui: ReactNode,
  {
    path = '/',
    queryClient = new QueryClient(),
  }: { path?: string; queryClient?: QueryClient } = {},
): Promise<RenderResult & { router: ReturnType<typeof createRouter> }> {
  const root = createRootRoute({
    component: () => (
      <>
        {ui}
        <Outlet />
      </>
    ),
  });
  const any = createRoute({ getParentRoute: () => root, path: '$', component: () => null });
  const router = createRouter({
    routeTree: root.addChildren([any]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router: router as unknown as ReturnType<typeof createRouter> };
}
