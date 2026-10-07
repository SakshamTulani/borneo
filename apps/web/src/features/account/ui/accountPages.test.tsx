import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { sessionQuery } from '@/features/auth';
import { apiError, customer, sentTo, stubApi } from '@/test/api';
import { renderWithRouter } from '@/test/router';
import { AccountOverview } from './AccountOverview';
import { DevicesPage } from './DevicesPage';
import { ProfilePage } from './ProfilePage';

afterEach(() => vi.unstubAllGlobals());

const client = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(sessionQuery.queryKey, customer);
  return qc;
};
const T = Date.UTC(2026, 9, 3);
const summary = {
  orders: 3,
  activeOrders: 1,
  devices: 2,
  reviewPrompts: 1,
  watching: 4,
  openReturns: 0,
  memberSince: Date.UTC(2026, 8, 15),
};

describe('AccountOverview', () => {
  it('D-223: profile, counts, recent orders and review prompts; axe clean', async () => {
    stubApi({
      'GET /me/summary': [200, summary],
      'GET /me/orders': [
        200,
        {
          items: [
            {
              id: '00000000-0000-4000-8000-000000000001',
              number: 'BN-000001',
              status: 'shipped',
              placedAt: T,
              totalPaise: 279_900,
              itemCount: 2,
              items: [{ name: 'Echo Buds 2', image: null }],
              eta: null,
              deliveredAt: null,
            },
          ],
          nextCursor: null,
        },
      ],
      'GET /me/reviews': [
        200,
        {
          prompts: [
            {
              orderItemId: 'i1',
              productId: 'p1',
              productName: 'Pulse 4',
              slug: 'pulse-4',
              image: null,
              deliveredAt: T,
            },
          ],
          reviews: [],
        },
      ],
    });
    const { container } = await renderWithRouter(<AccountOverview />, { queryClient: client() });
    expect(await screen.findByText('Echo Buds 2 and 1 more')).toBeTruthy();
    expect(screen.getByText('1 on the way')).toBeTruthy();
    expect(screen.getByText('September 2026')).toBeTruthy();
    expect(screen.getByText('98765 43210')).toBeTruthy();
    expect(await screen.findByText('Pulse 4')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('invites a first order when there are none', async () => {
    stubApi({
      'GET /me/summary': [200, { ...summary, orders: 0, activeOrders: 0 }],
      'GET /me/orders': [200, { items: [], nextCursor: null }],
      'GET /me/reviews': [200, { prompts: [], reviews: [] }],
    });
    await renderWithRouter(<AccountOverview />, { queryClient: client() });
    expect(await screen.findByRole('link', { name: 'Start shopping' })).toBeTruthy();
  });
});

describe('ProfilePage', () => {
  it('D-223: saves name and mobile, keeps the email, and checks the mobile', async () => {
    const qc = client();
    const api = stubApi({
      'PATCH /me/profile': [200, { customer: { ...customer, name: 'Asha R Rao' } }],
    });
    const { container } = await renderWithRouter(<ProfilePage />, { queryClient: qc });
    expect((screen.getByLabelText('Email') as HTMLInputElement).readOnly).toBe(true);
    expect(await axe(container)).toHaveNoViolations();
    const mobile = screen.getByLabelText('Mobile number');
    await userEvent.clear(mobile);
    await userEvent.type(mobile, '12345');
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }));
    expect(await screen.findByText('Enter a 10-digit mobile number')).toBeTruthy();
    await userEvent.clear(mobile);
    await userEvent.type(mobile, '91234 56780');
    const name = screen.getByLabelText('Full name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Asha R Rao');
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }));
    await waitFor(() =>
      expect(sentTo(api, 'PATCH /me/profile')).toEqual([
        { name: 'Asha R Rao', phone: '9123456780' },
      ]),
    );
    await waitFor(() =>
      expect((qc.getQueryData(sessionQuery.queryKey) as { name: string }).name).toBe('Asha R Rao'),
    );
  });

  it('D-223: a wrong current password shows the API message', async () => {
    stubApi({
      'POST /me/password': apiError(400, 'WRONG_PASSWORD', 'Your current password is incorrect.'),
    });
    await renderWithRouter(<ProfilePage />, { queryClient: client() });
    await userEvent.type(screen.getByLabelText('Current password'), 'nope1234');
    await userEvent.type(screen.getByLabelText('New password'), 'newpass123');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Your current password is incorrect.')).toBeTruthy();
  });
});

describe('DevicesPage', () => {
  it('D-220: owned devices with add-ons and their reason; axe clean', async () => {
    stubApi({
      'GET /me/devices': [
        200,
        {
          items: [
            {
              productId: 'p1',
              slug: 'pulse-4',
              name: 'Pulse 4',
              category: 'Smartphones',
              options: { colour: 'Forest' },
              image: null,
              orderId: '00000000-0000-4000-8000-000000000001',
              orderNumber: 'BN-000001',
              deliveredAt: T,
              returnWindowEndsAt: null,
              accessories: [
                {
                  slug: 'case-pulse-4',
                  name: 'Pulse 4 case',
                  pricePaise: 99_900,
                  image: null,
                  reason: 'Made for Pulse 4',
                },
              ],
            },
          ],
        },
      ],
    });
    const { container } = await renderWithRouter(<DevicesPage />, { queryClient: client() });
    expect(await screen.findByText('Goes well with your Pulse 4')).toBeTruthy();
    expect(screen.getByText('Made for Pulse 4')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-24: nothing owned until something is delivered', async () => {
    stubApi({ 'GET /me/devices': [200, { items: [] }] });
    await renderWithRouter(<DevicesPage />, { queryClient: client() });
    expect(await screen.findByText('No devices yet')).toBeTruthy();
  });
});
