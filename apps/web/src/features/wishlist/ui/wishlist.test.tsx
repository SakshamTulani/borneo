import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { customer, sentTo, stubApi } from '@/test/api';
import { summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { WishlistButton } from './WishlistButton';
import { WishlistLink } from './WishlistLink';
import { WishlistPage } from './WishlistPage';

afterEach(() => vi.unstubAllGlobals());

const client = (signedIn = true) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['session'], signedIn ? customer : null);
  return qc;
};

describe('WishlistButton', () => {
  it('D-235: saves and removes from the heart; axe clean', async () => {
    let saved: string[] = [];
    const api = stubApi({
      'GET /me/wishlist/slugs': () => [200, { slugs: saved }],
      'PUT /me/wishlist/pulse-4': () => ((saved = ['pulse-4']), [200, { slugs: saved }]),
      'DELETE /me/wishlist/pulse-4': () => ((saved = []), [200, { slugs: saved }]),
      'GET /me/wishlist': [200, { items: [], nextCursor: null, total: 0 }],
    });
    const { container } = await renderWithRouter(
      <WishlistButton slug="pulse-4" name="Pulse 4" compact />,
      { queryClient: client() },
    );
    const heart = await screen.findByRole('button', { name: 'Save Pulse 4 to your wishlist' });
    expect(heart.getAttribute('aria-pressed')).toBe('false');
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(heart);
    const on = await screen.findByRole('button', { name: 'Remove Pulse 4 from your wishlist' });
    expect(on.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(on);
    await screen.findByRole('button', { name: 'Save Pulse 4 to your wishlist' });
    expect(sentTo(api, 'PUT /me/wishlist/pulse-4')).toHaveLength(1);
    expect(sentTo(api, 'DELETE /me/wishlist/pulse-4')).toHaveLength(1);
  });

  it('D-235: signed out, the heart asks to sign in and comes back', async () => {
    await renderWithRouter(<WishlistButton slug="pulse-4" name="Pulse 4" />, {
      queryClient: client(false),
      path: '/products/pulse-4',
    });
    const link = screen.getByRole('link', { name: 'Sign in to save Pulse 4 to your wishlist' });
    expect(link.getAttribute('href')).toContain('/sign-in?redirect=');
  });
});

describe('WishlistPage', () => {
  it('D-235: saved products newest first, with a count and paging; axe clean', async () => {
    stubApi({
      'GET /me/wishlist': (_b, url) =>
        url.searchParams.get('cursor')
          ? [
              200,
              {
                items: [
                  {
                    product: summaryFixture({ id: 'b', slug: 'old', name: 'Older one' }),
                    addedAt: 1,
                  },
                ],
                nextCursor: null,
                total: 2,
              },
            ]
          : [
              200,
              {
                items: [
                  {
                    product: summaryFixture({ id: 'a', slug: 'new', name: 'Newer one' }),
                    addedAt: 2,
                  },
                ],
                nextCursor: 'c1',
                total: 2,
              },
            ],
      'GET /me/wishlist/slugs': [200, { slugs: ['new', 'old'] }],
    });
    const { container } = await renderWithRouter(<WishlistPage />, { queryClient: client() });
    expect(await screen.findByText('2 saved products')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole('button', { name: 'Show more (1)' }));
    expect(await screen.findByText('Older one')).toBeTruthy();
  });

  it('says so when nothing is saved', async () => {
    stubApi({ 'GET /me/wishlist': [200, { items: [], nextCursor: null, total: 0 }] });
    await renderWithRouter(<WishlistPage />, { queryClient: client() });
    expect(await screen.findByText('Your wishlist is empty')).toBeTruthy();
  });
});

describe('WishlistLink', () => {
  it('shows how many are saved, only when signed in', async () => {
    stubApi({ 'GET /me/wishlist/slugs': [200, { slugs: ['a', 'b'] }] });
    await renderWithRouter(<WishlistLink />, { queryClient: client() });
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Wishlist, 2 saved' })).toBeTruthy(),
    );
  });
});
