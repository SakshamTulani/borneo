import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { WatchItem } from '@borneo/shared';
import { customer, sentTo, stubApi } from '@/test/api';
import { renderWithRouter } from '@/test/router';
import { WatchButton } from './WatchButton';
import { WatchPage } from './WatchPage';

afterEach(() => vi.unstubAllGlobals());

const client = (signedIn = true) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['session'], signedIn ? customer : null);
  return qc;
};
const item = (over: Partial<WatchItem> = {}): WatchItem => ({
  sku: 'EB2-BLK',
  slug: 'echo-buds-2',
  name: 'Echo Buds 2',
  options: { colour: 'Black' },
  image: null,
  pricePaise: 279_900,
  availability: 'outOfStock',
  createdAt: 0,
  ...over,
});

describe('WatchButton', () => {
  it('D-147: nothing to watch while it is in stock', async () => {
    stubApi({ 'GET /me/watch': [200, { items: [] }] });
    const { container } = await renderWithRouter(
      <WatchButton sku="EB2-BLK" availability="inStock" />,
      { queryClient: client() },
    );
    await waitFor(() => expect(container.querySelector('button')).toBeNull());
  });

  it('D-222: signed out, it asks to sign in first', async () => {
    await renderWithRouter(<WatchButton sku="EB2-BLK" availability="outOfStock" />, {
      queryClient: client(false),
    });
    expect(screen.getByRole('link', { name: 'Sign in to watch this item' })).toBeTruthy();
  });

  it('D-222: signed in, it starts and stops watching; axe clean', async () => {
    let watching = false;
    const api = stubApi({
      'GET /me/watch': () => [200, { items: watching ? [item()] : [] }],
      'PUT /me/watch/EB2-BLK': () => ((watching = true), [200, { items: [item()] }]),
      'DELETE /me/watch/EB2-BLK': () => ((watching = false), [200, { items: [] }]),
      'GET /me/summary': [200, {}],
    });
    const { container } = await renderWithRouter(
      <WatchButton sku="EB2-BLK" availability="outOfStock" />,
      { queryClient: client() },
    );
    const button = await screen.findByRole('button', { name: 'Watch this item' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(button);
    const on = await screen.findByRole('button', { name: 'Watching: stop watching' });
    expect(on.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(on);
    await screen.findByRole('button', { name: 'Watch this item' });
    expect(sentTo(api, 'PUT /me/watch/EB2-BLK')).toHaveLength(1);
    expect(sentTo(api, 'DELETE /me/watch/EB2-BLK')).toHaveLength(1);
  });
});

describe('WatchPage', () => {
  it('D-222: shows where each item stands and removes it; axe clean', async () => {
    const api = stubApi({
      'GET /me/watch': [200, { items: [item({ availability: 'inStock' })] }],
      'DELETE /me/watch/EB2-BLK': [200, { items: [] }],
      'GET /me/summary': [200, {}],
    });
    const { container } = await renderWithRouter(<WatchPage />, { queryClient: client() });
    expect(await screen.findByText('Back in stock')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText("You're not watching anything")).toBeTruthy();
    expect(sentTo(api, 'DELETE /me/watch/EB2-BLK')).toHaveLength(1);
  });
});
