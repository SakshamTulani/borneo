import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { Deal } from '@borneo/shared';
import { stubApi } from '@/test/api';
import { summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { DealsPage } from './DealsPage';

afterEach(() => vi.unstubAllGlobals());

const deal = (over: Partial<Deal> = {}): Deal => ({
  product: summaryFixture({ name: 'Echo Buds 2', slug: 'echo-buds-2' }),
  sku: 'EB2-BLK',
  salePricePaise: 279_900,
  regularPricePaise: 349_900,
  startsAt: Date.UTC(2026, 9, 6, 6),
  endsAt: Date.UTC(2026, 9, 6, 12),
  state: 'live',
  remaining: null,
  ...over,
});
const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('DealsPage', () => {
  it('D-231: live sales with their price and countdown, upcoming with the start; axe clean', async () => {
    stubApi({
      'GET /deals': [
        200,
        {
          live: [
            deal({ remaining: 3 }),
            deal({
              sku: 'X',
              state: 'soldOut',
              product: summaryFixture({ name: 'Gone', slug: 'gone' }),
            }),
          ],
          upcoming: [
            deal({
              sku: 'Y',
              state: 'upcoming',
              product: summaryFixture({ name: 'Pulse 4', slug: 'pulse-4' }),
            }),
          ],
        },
      ],
    });
    const { container } = await renderWithRouter(<DealsPage offers={<p>Offers here</p>} />, {
      queryClient: qc(),
    });
    expect(await screen.findByText('Only 3 left')).toBeTruthy();
    expect(screen.getAllByText('₹2,799').length).toBeGreaterThan(0);
    expect(screen.getByText(/Sold out\. The sale ends/)).toBeTruthy();
    expect(screen.getByText('Coming up this week')).toBeTruthy();
    expect(screen.getByText(/^Starts /)).toBeTruthy();
    expect(screen.getByText('Offers here')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-140: nothing live says so, without inventing urgency', async () => {
    stubApi({ 'GET /deals': [200, { live: [], upcoming: [] }] });
    await renderWithRouter(<DealsPage />, { queryClient: qc() });
    expect(await screen.findByText('No flash sale right now')).toBeTruthy();
  });
});
