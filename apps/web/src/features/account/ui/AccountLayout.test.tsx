import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { sessionQuery } from '@/features/auth';
import { customer, stubApi } from '@/test/api';
import { renderWithRouter } from '@/test/router';
import { AccountLayout } from './AccountLayout';
import { AccountOverview } from './AccountOverview';

afterEach(() => vi.unstubAllGlobals());

function signedIn() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(sessionQuery.queryKey, customer);
  queryClient.setQueryData(['me', 'addresses'], []);
  return queryClient;
}

describe('AccountLayout', () => {
  it('shows the sections with the unread count and the customer details; axe clean', async () => {
    stubApi({ 'GET /me/notifications': [200, { items: [], nextCursor: null, unread: 2 }] });
    const { container } = await renderWithRouter(
      <AccountLayout onSignedOut={() => {}}>
        <AccountOverview />
      </AccountLayout>,
      { path: '/account', queryClient: signedIn() },
    );
    const nav = screen.getByRole('navigation', { name: 'Account' });
    expect(await screen.findByText('2')).toBeTruthy();
    expect(nav.textContent).toContain('Inbox2 unread');
    expect(screen.getByText('98765 43210')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('signing out drops customer data and hands over', async () => {
    stubApi({
      'GET /me/notifications': [200, { items: [], nextCursor: null, unread: 0 }],
      'POST /auth/sign-out': [204],
    });
    const queryClient = signedIn();
    const onSignedOut = vi.fn();
    await renderWithRouter(
      <AccountLayout onSignedOut={onSignedOut}>
        <p>page</p>
      </AccountLayout>,
      { queryClient },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(onSignedOut).toHaveBeenCalled());
    expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeNull();
    expect(queryClient.getQueryData(['me', 'addresses'])).toBeUndefined();
  });
});
