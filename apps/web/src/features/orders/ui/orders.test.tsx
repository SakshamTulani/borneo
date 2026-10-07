import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { OrderView, ReturnRequestView } from '@borneo/shared';
import { apiError, customer, sentTo, stubApi } from '@/test/api';
import { orderFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { OrderDetailPage } from './OrderDetailPage';
import { OrdersPage } from './OrdersPage';
import { ReturnsPage } from './ReturnsPage';

afterEach(() => vi.unstubAllGlobals());

const client = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['session'], customer);
  return qc;
};
const T = Date.UTC(2026, 9, 6, 6, 30);
const steps = (reached: number): OrderView['tracking']['steps'] =>
  (['placed', 'confirmed', 'packed', 'shipped', 'outForDelivery', 'delivered'] as const).map(
    (step, i) => ({
      step,
      at: i < reached ? T + i * 60_000 : null,
      state: i < reached ? 'done' : i === reached ? 'current' : 'upcoming',
    }),
  );
const confirmed = (over: Partial<OrderView> = {}) =>
  orderFixture({
    status: 'confirmed',
    holdExpiresAt: null,
    payment: { method: 'upi', bank: null, tenureMonths: null, attemptId: null },
    tracking: { steps: steps(2), courier: null, trackingNo: null },
    ...over,
  });
const delivered = (over: Partial<OrderView> = {}) => {
  const base = confirmed();
  return confirmed({
    status: 'delivered',
    canCancel: false,
    deliveredAt: T + 3 * 86_400_000,
    tracking: { steps: steps(6), courier: 'Borneo Express (demo)', trackingNo: 'BX00000042IN' },
    items: base.items.map((i) => ({
      ...i,
      returnWindowEndsAt: T + 10 * 86_400_000,
      returnOptions: [
        { kind: 'return' as const, reasons: ['defect', 'damage', 'changedMind', 'other'] as const },
        { kind: 'replacement' as const, reasons: ['defect', 'damage'] as const },
      ].map((o) => ({ ...o, reasons: [...o.reasons] })),
    })),
    ...over,
  });
};
const request = (over: Partial<ReturnRequestView> = {}): ReturnRequestView => ({
  id: 'r1',
  orderId: orderFixture().id,
  orderNumber: 'BN-000042',
  orderItemId: orderFixture().items[0]!.id,
  productName: 'Borneo Pulse 4',
  kind: 'return',
  reason: 'changedMind',
  details: null,
  photoCount: 0,
  status: 'requested',
  refundPaise: null,
  createdAt: T,
  updatedAt: T,
  demoNextStatus: null,
  ...over,
});

describe('OrdersPage', () => {
  it('lists orders newest first with their status, and pages; axe clean', async () => {
    const row = (n: number) => ({
      id: `00000000-0000-4000-8000-00000000000${n}`,
      number: `BN-00000${n}`,
      status: n === 1 ? 'delivered' : 'confirmed',
      placedAt: T,
      totalPaise: 100_00,
      itemCount: 3,
      items: [
        { name: 'Echo Buds 2', image: null },
        { name: 'Cable', image: null },
      ],
      eta: { from: '2026-10-08', to: '2026-10-09' },
      deliveredAt: n === 1 ? T : null,
    });
    stubApi({
      'GET /me/orders': (_b, url) =>
        url.searchParams.get('cursor')
          ? [200, { items: [row(2)], nextCursor: null }]
          : [200, { items: [row(1)], nextCursor: 'next' }],
    });
    const { container } = await renderWithRouter(<OrdersPage />, { queryClient: client() });
    expect(await screen.findByText('Order BN-000001')).toBeTruthy();
    expect(screen.getByText('Echo Buds 2, Cable and 1 more')).toBeTruthy();
    expect(screen.getByText('Delivered')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole('button', { name: 'Show older orders' }));
    expect(await screen.findByText('Order BN-000002')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show older orders' })).toBeNull();
  });

  it('says so when there are no orders', async () => {
    stubApi({ 'GET /me/orders': [200, { items: [], nextCursor: null }] });
    await renderWithRouter(<OrdersPage />, { queryClient: client() });
    expect(await screen.findByText('No orders yet')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Start shopping' })).toBeTruthy();
  });
});

describe('OrderDetailPage', () => {
  it('D-215: shows the tracking timeline; the demo courier moves it one step', async () => {
    const order = confirmed({ demoNextStep: 'packed' });
    const api = stubApi({
      [`GET /me/orders/${order.id}`]: [200, order],
      [`POST /me/orders/${order.id}/demo/advance`]: [
        200,
        confirmed({ status: 'packed', tracking: { ...order.tracking, steps: steps(3) } }),
      ],
      'GET /me/orders': [200, { items: [], nextCursor: null }],
    });
    const { container } = await renderWithRouter(<OrderDetailPage orderId={order.id} />, {
      queryClient: client(),
    });
    const progress = await screen.findByRole('list', { name: 'Order progress' });
    expect(within(progress).getAllByRole('listitem')).toHaveLength(6);
    expect(progress.querySelector('[aria-current="step"]')?.textContent).toContain('Packed');
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole('button', { name: 'Advance to “Packed”' }));
    await waitFor(() =>
      expect(progress.querySelector('[aria-current="step"]')?.textContent).toContain('Shipped'),
    );
    expect(sentTo(api, `POST /me/orders/${order.id}/demo/advance`)).toHaveLength(1);
  });

  it('D-216: cancelling asks first, says what is refunded, and shows the result', async () => {
    const order = confirmed();
    const api = stubApi({
      [`GET /me/orders/${order.id}`]: [200, order],
      [`POST /me/orders/${order.id}/cancel`]: [
        200,
        confirmed({
          status: 'cancelled',
          canCancel: false,
          notice: 'CANCELLED_BY_CUSTOMER',
          refunds: [{ amountPaise: order.totalPaise, status: 'processed', reason: 'x', at: T }],
        }),
      ],
      'GET /me/orders': [200, { items: [], nextCursor: null }],
    });
    await renderWithRouter(<OrderDetailPage orderId={order.id} />, { queryClient: client() });
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('₹24,999 goes back to your original payment method');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, cancel it' }));
    expect(await screen.findByText('Order cancelled')).toBeTruthy();
    expect(screen.getByText('You cancelled this order.')).toBeTruthy();
    expect(screen.getByText('Refunded')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
    expect(sentTo(api, `POST /me/orders/${order.id}/cancel`)).toHaveLength(1);
  });

  it('D-149: no cancel once shipped', async () => {
    const order = confirmed({ status: 'shipped', canCancel: false });
    stubApi({ [`GET /me/orders/${order.id}`]: [200, order] });
    await renderWithRouter(<OrderDetailPage orderId={order.id} />, { queryClient: client() });
    expect(await screen.findByText('Order BN-000042')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
  });

  it('D-217: a delivered line offers a request; nothing is chosen and defect needs a photo', async () => {
    const order = delivered();
    const item = order.items[0]!;
    const api = stubApi({
      [`GET /me/orders/${order.id}`]: [200, order],
      [`POST /me/orders/${order.id}/items/${item.id}/returns`]: [201, request()],
    });
    const { baseElement } = await renderWithRouter(<OrderDetailPage orderId={order.id} />, {
      queryClient: client(),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Return or replace' }));
    const dialog = screen.getByRole('dialog');
    // D-06: neither the kind nor the reason is chosen for the customer.
    const kinds = within(dialog).getByRole('radiogroup', { name: 'What would you like?' });
    expect(
      within(kinds)
        .getAllByRole('radio')
        .every((r) => r.getAttribute('aria-checked') === 'false'),
    ).toBe(true);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }));
    expect(within(dialog).getByText('Choose return or replacement')).toBeTruthy();
    await userEvent.click(within(kinds).getByText('Return'));
    const reasons = within(dialog).getByRole('radiogroup', { name: 'Reason' });
    expect(
      within(reasons)
        .getAllByRole('radio')
        .every((r) => r.getAttribute('aria-checked') === 'false'),
    ).toBe(true);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }));
    expect(within(dialog).getByText('Choose a reason')).toBeTruthy();
    await userEvent.click(within(dialog).getByText('It has a defect'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }));
    expect(
      await within(dialog).findByText('Add at least one photo showing the defect or damage.'),
    ).toBeTruthy();
    expect(await axe(baseElement)).toHaveNoViolations();
    await userEvent.click(within(dialog).getByText('I changed my mind'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }));
    await waitFor(() =>
      expect(sentTo(api, `POST /me/orders/${order.id}/items/${item.id}/returns`)).toEqual([
        { kind: 'return', reason: 'changedMind', photos: [] },
      ]),
    );
  });

  it('D-219: shows the API reason when a request is refused', async () => {
    const order = delivered();
    const item = order.items[0]!;
    stubApi({
      [`GET /me/orders/${order.id}`]: [200, order],
      [`POST /me/orders/${order.id}/items/${item.id}/returns`]: apiError(
        422,
        'WINDOW_CLOSED',
        'The 7-day window for this item has closed.',
      ),
    });
    await renderWithRouter(<OrderDetailPage orderId={order.id} />, { queryClient: client() });
    await userEvent.click(await screen.findByRole('button', { name: 'Return or replace' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByText('Return'));
    await userEvent.click(within(dialog).getByText('Something else'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }));
    expect(await within(dialog).findByRole('alert')).toBeTruthy();
    expect(dialog.textContent).toContain('The 7-day window for this item has closed.');
  });

  it('D-219: an open request shows its state, with the demo desk control in demo', async () => {
    const order = delivered();
    const items = order.items.map((i) => ({
      ...i,
      returnOptions: [],
      returnRequest: request({ demoNextStatus: 'approved' }),
    }));
    const api = stubApi({
      [`GET /me/orders/${order.id}`]: [200, { ...order, items }],
      'POST /me/returns/r1/demo/advance': [200, request({ status: 'approved' })],
      'GET /me/orders': [200, { items: [], nextCursor: null }],
    });
    await renderWithRouter(<OrderDetailPage orderId={order.id} />, { queryClient: client() });
    expect(await screen.findByText('Return: Requested')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Return or replace' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Demo: mark approved' }));
    await waitFor(() => expect(sentTo(api, 'POST /me/returns/r1/demo/advance')).toHaveLength(1));
  });
});

describe('ReturnsPage', () => {
  it('D-219: lists requests with their status and refund; axe clean', async () => {
    stubApi({
      'GET /me/returns': [
        200,
        {
          items: [
            request({ status: 'completed', refundPaise: 279_900, details: 'Left bud silent' }),
          ],
          nextCursor: null,
        },
      ],
    });
    const { container } = await renderWithRouter(<ReturnsPage />, { queryClient: client() });
    expect(await screen.findByText('Completed')).toBeTruthy();
    expect(screen.getByText('₹2,799 refunded to your original payment method')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'order BN-000042' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says so when there are none', async () => {
    stubApi({ 'GET /me/returns': [200, { items: [], nextCursor: null }] });
    await renderWithRouter(<ReturnsPage />, { queryClient: client() });
    expect(await screen.findByText('No returns')).toBeTruthy();
  });

  it('pages older requests ten at a time', async () => {
    stubApi({
      'GET /me/returns': (_b, url) =>
        url.searchParams.get('cursor')
          ? [200, { items: [request({ id: 'r2', productName: 'Older item' })], nextCursor: null }]
          : [200, { items: [request()], nextCursor: 'c1' }],
    });
    await renderWithRouter(<ReturnsPage />, { queryClient: client() });
    await userEvent.click(await screen.findByRole('button', { name: 'Show older requests' }));
    expect(await screen.findByText('Return · Older item')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show older requests' })).toBeNull();
  });
});
