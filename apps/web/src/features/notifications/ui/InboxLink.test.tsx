import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { customer, stubApi } from '@/test/api';
import { renderWithRouter } from '@/test/router';
import { InboxLink } from './InboxLink';

afterEach(() => vi.unstubAllGlobals());

const client = (signedIn: boolean) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['session'], signedIn ? customer : null);
  return qc;
};

describe('InboxLink', () => {
  it('D-101: links to the inbox with the unread count; axe clean', async () => {
    stubApi({ 'GET /me/notifications': [200, { items: [], nextCursor: null, unread: 3 }] });
    const { container } = await renderWithRouter(<InboxLink />, { queryClient: client(true) });
    const link = await screen.findByRole('link', { name: 'Inbox, 3 unread' });
    expect(link.getAttribute('href')).toBe('/account/inbox');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows no count when everything is read', async () => {
    stubApi({ 'GET /me/notifications': [200, { items: [], nextCursor: null, unread: 0 }] });
    await renderWithRouter(<InboxLink />, { queryClient: client(true) });
    await waitFor(() => expect(screen.getByRole('link', { name: 'Inbox' })).toBeTruthy());
  });

  it('is absent, with no request, when signed out', async () => {
    const api = stubApi({});
    const { container } = await renderWithRouter(<InboxLink />, { queryClient: client(false) });
    expect(container.querySelector('a')).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });
});
