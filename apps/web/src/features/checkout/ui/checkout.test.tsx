import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { apiError, customer, sentTo, stubApi } from '@/test/api';
import { checkoutFixture, orderFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import type { CheckoutChoice } from '../model';
import { CheckoutPage } from './CheckoutPage';
import { OrderConfirmedPage } from './OrderConfirmedPage';
import { PaymentPage } from './PaymentPage';

// Leaflet needs a real browser; the stand-in reports a centre like a moved map would.
vi.mock('@/shared/ui/map/LeafletMap', () => ({
  LeafletMap: ({
    onCentreChange,
  }: {
    onCentreChange: (c: { lat: number; lng: number }) => void;
  }) => (
    <button type="button" onClick={() => onCentreChange({ lat: 12.9352, lng: 77.6245 })}>
      Fake map
    </button>
  ),
}));

afterEach(() => vi.unstubAllGlobals());

const client = (signedIn: boolean) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['session'], signedIn ? customer : null);
  return qc;
};

const address = {
  id: 'a1',
  name: 'Asha Rao',
  phone: '9876543210',
  line1: '12, 4th Cross',
  line2: null,
  landmark: null,
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560034',
  lat: 12.9352,
  lng: 77.6245,
  isDefault: true,
};

function renderCheckout(
  choice: CheckoutChoice,
  view = checkoutFixture(),
  extra: Parameters<typeof stubApi>[0] = {},
) {
  const onChoice = vi.fn();
  const onPlaced = vi.fn();
  const api = stubApi({
    'GET /me/checkout': [200, view],
    'GET /me/addresses': [200, { items: [address] }],
    ...extra,
  });
  return {
    onChoice,
    onPlaced,
    api,
    rendered: renderWithRouter(
      <CheckoutPage choice={choice} onChoice={onChoice} onPlaced={onPlaced} />,
      { queryClient: client(true) },
    ),
  };
}

describe('CheckoutPage, signed in', () => {
  it('D-06: nothing is chosen; the order waits for a payment method; no cross-sell (D-73); axe clean', async () => {
    const { rendered } = renderCheckout({});
    const { container } = await rendered;
    expect(await screen.findByRole('radio', { name: /Asha Rao \(default\)/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Asha Rao/ }).getAttribute('aria-checked')).toBe(
      'true',
    );
    for (const name of ['UPI', 'Credit or debit card', 'EMI'])
      expect(
        screen.getByRole('radio', { name: new RegExp(name) }).getAttribute('aria-checked'),
      ).toBe('false');
    // D-55: the delivery date for each item at this address.
    expect(screen.getByText('Delivery Thu, 8 – Fri, 9 Oct')).toBeTruthy();
    expect(screen.getByText('Choose how to pay.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Place order' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText(/Goes well with/)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-71: COD is shown but unavailable, with the reason', async () => {
    await renderCheckout({}).rendered;
    const cod = await screen.findByRole('radio', { name: /Cash on delivery/ });
    expect(cod.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Not available: flash sale prices are paid online.')).toBeTruthy();
  });

  it('D-55: choosing the address or method rechecks through the URL; COD drops any payment offer', async () => {
    const { onChoice, rendered } = renderCheckout({ paymentOfferId: 'po-hdfc' });
    await rendered;
    await userEvent.click(await screen.findByRole('radio', { name: /^UPI/ }));
    expect(onChoice).toHaveBeenLastCalledWith({
      method: 'upi',
      bank: undefined,
      tenureMonths: undefined,
    });
  });

  it('D-202: EMI lists the plans available with their instalment; a card offers its banks', async () => {
    const { onChoice, rendered } = renderCheckout({ method: 'emi' });
    await rendered;
    await userEvent.click(await screen.findByRole('radio', { name: /₹4,351\/mo for 6 months/ }));
    expect(onChoice).toHaveBeenLastCalledWith({ bank: 'HDFC', tenureMonths: 6 });
    expect(screen.getByText(/no-cost EMI offer available/)).toBeTruthy();
  });

  it('D-35: one payment offer, chosen by the customer, with what it saves', async () => {
    const { onChoice, rendered } = renderCheckout({ method: 'card' });
    await rendered;
    const none = await screen.findByRole('radio', { name: 'No payment offer' });
    expect(none.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Saves ₹1,500')).toBeTruthy();
    await userEvent.click(screen.getByRole('radio', { name: /10% off with HDFC cards/ }));
    expect(onChoice).toHaveBeenLastCalledWith({ paymentOfferId: 'po-hdfc' });
  });

  it('D-201: places the order with an Idempotency-Key and the total the customer saw', async () => {
    const order = orderFixture();
    const { api, onPlaced, rendered } = renderCheckout(
      { method: 'upi' },
      checkoutFixture({ blocks: [], canPlace: true }),
      { 'POST /me/orders': [200, order] },
    );
    await rendered;
    await userEvent.click(await screen.findByRole('button', { name: 'Pay ₹24,999' }));
    await waitFor(() => expect(onPlaced).toHaveBeenCalledWith(order));
    expect(sentTo(api, 'POST /me/orders')[0]).toEqual({
      addressId: 'a1',
      payment: { method: 'upi' },
      expectedTotalPaise: 2_499_900,
    });
    const init = api.mock.calls.find(([, i]) => i?.method === 'POST')![1]!;
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toMatch(
      /^ord-[0-9a-f]{32}$/,
    );
    expect(screen.getByText(/We hold your items for 5 minutes/)).toBeTruthy();
  });

  it('D-201: after a server error the retry reuses the key, so it can never order twice', async () => {
    const order = orderFixture();
    let calls = 0;
    const { api, onPlaced, rendered } = renderCheckout(
      { method: 'upi' },
      checkoutFixture({ blocks: [], canPlace: true }),
      { 'POST /me/orders': () => (calls++ === 0 ? [500] : [200, order]) },
    );
    await rendered;
    const pay = await screen.findByRole('button', { name: 'Pay ₹24,999' });
    await userEvent.click(pay);
    expect(await screen.findByText(/Something went wrong/)).toBeTruthy();
    await userEvent.click(pay);
    await waitFor(() => expect(onPlaced).toHaveBeenCalledWith(order));
    const keys = api.mock.calls
      .filter(([, i]) => i?.method === 'POST')
      .map(([, i]) => (i!.headers as Record<string, string>)['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('D-201: a changed total is shown, and nothing is placed', async () => {
    const view = checkoutFixture({ blocks: [], canPlace: true });
    let quotes = 0;
    const { onPlaced, rendered } = renderCheckout({ method: 'upi' }, view, {
      'GET /me/checkout': () => [
        200,
        quotes++ === 0 ? view : { ...view, totals: { ...view.totals, totalPaise: 2_599_900 } },
      ],
      'POST /me/orders': [
        409,
        {
          error: {
            code: 'PRICE_CHANGED',
            message: 'Prices or offers changed.',
            details: { totalPaise: 2_599_900 },
          },
        },
      ],
    });
    await rendered;
    await userEvent.click(await screen.findByRole('button', { name: 'Pay ₹24,999' }));
    expect(
      await screen.findByText('The total changed to ₹25,999. Check it and place the order again.'),
    ).toBeTruthy();
    expect(onPlaced).not.toHaveBeenCalled();
  });
});

describe('CheckoutPage, signed out (D-90, D-92)', () => {
  it('makes the account here: name and mobile from the address; sign in offered; axe clean', async () => {
    const api = stubApi({
      'GET /pincodes/560034': [
        200,
        { pincode: '560034', city: 'Bengaluru', state: 'Karnataka', lat: 12.93, lng: 77.63 },
      ],
      'POST /auth/sign-up': [200, { customer }],
      'POST /me/addresses': [201, address],
      'GET /me/checkout': [200, checkoutFixture()],
      'GET /me/addresses': [200, { items: [address] }],
    });
    const { container } = await renderWithRouter(
      <CheckoutPage choice={{}} onChoice={() => {}} onPlaced={() => {}} />,
      { queryClient: client(false) },
    );
    expect(screen.getByRole('link', { name: 'Sign in to check out' }).getAttribute('href')).toBe(
      '/sign-in?redirect=%2Fcheckout',
    );
    expect(await axe(container)).toHaveNoViolations();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'long-enough-password');
    await user.type(screen.getByLabelText('Full name'), 'Asha Rao');
    await user.type(screen.getByLabelText('Mobile number'), '98765 43210');
    await user.type(screen.getByLabelText('Pincode'), '560034');
    await waitFor(() =>
      expect((screen.getByLabelText('City') as HTMLInputElement).value).toBe('Bengaluru'),
    );
    await user.type(screen.getByLabelText('House, flat and street'), '12, 4th Cross');
    await user.click(screen.getByRole('button', { name: 'Place pin on map' }));
    await user.click(await screen.findByRole('button', { name: 'Fake map' }));
    await user.click(screen.getByRole('button', { name: 'Save pin' }));
    await user.click(screen.getByRole('button', { name: 'Create account and continue' }));

    await waitFor(() => expect(sentTo(api, 'POST /me/addresses')).toHaveLength(1));
    expect(sentTo(api, 'POST /auth/sign-up')[0]).toEqual({
      name: 'Asha Rao',
      phone: '9876543210',
      email: 'asha@example.com',
      password: 'long-enough-password',
    });
    expect(sentTo(api, 'POST /me/addresses')[0]).toMatchObject({
      isDefault: true,
      pincode: '560034',
    });
    // Signed in now: checkout itself shows.
    expect(await screen.findByRole('heading', { name: 'Payment' })).toBeTruthy();
  });

  it('a taken email says so and links to sign in', async () => {
    stubApi({
      'GET /pincodes/560034': [
        200,
        { pincode: '560034', city: 'Bengaluru', state: 'Karnataka', lat: 12.93, lng: 77.63 },
      ],
      'POST /auth/sign-up': apiError(409, 'EMAIL_TAKEN', 'An account already uses this email.'),
    });
    await renderWithRouter(<CheckoutPage choice={{}} onChoice={() => {}} onPlaced={() => {}} />, {
      queryClient: client(false),
    });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'long-enough-password');
    await user.type(screen.getByLabelText('Full name'), 'Asha Rao');
    await user.type(screen.getByLabelText('Mobile number'), '9876543210');
    await user.type(screen.getByLabelText('Pincode'), '560034');
    await user.type(screen.getByLabelText('House, flat and street'), '12, 4th Cross');
    await user.click(screen.getByRole('button', { name: 'Place pin on map' }));
    await user.click(await screen.findByRole('button', { name: 'Fake map' }));
    await user.click(screen.getByRole('button', { name: 'Save pin' }));
    await user.click(screen.getByRole('button', { name: 'Create account and continue' }));
    expect(await screen.findByText(/An account already uses this email/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toContain(
      'email=asha%40example.com',
    );
  });
});

describe('PaymentPage', () => {
  const order = orderFixture();
  const path = `/me/orders/${order.id}`;

  it('D-56: shows the real hold end and the mock gateway in demo; axe clean (D-213)', async () => {
    const api = stubApi({
      [`GET ${path}`]: [200, order],
      [`POST ${path}/payments/${order.payment.attemptId}/mock`]: [
        200,
        { ...order, status: 'confirmed', holdExpiresAt: null },
      ],
    });
    const onConfirmed = vi.fn();
    const { container } = await renderWithRouter(
      <PaymentPage orderId={order.id} onConfirmed={onConfirmed} />,
      { queryClient: client(true) },
    );
    expect(await screen.findByRole('timer')).toBeTruthy();
    expect(screen.getByText('Your items are held')).toBeTruthy();
    expect(screen.getByRole('note', { name: 'Demo mode: mock payment gateway' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole('button', { name: 'Pay ₹24,999' }));
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled());
    expect(sentTo(api, `POST ${path}/payments/${order.payment.attemptId}/mock`)).toEqual([
      { result: 'success' },
    ]);
  });

  it('D-204: after a failure the customer can try again within the same hold', async () => {
    const failed = orderFixture({
      notice: 'PAYMENT_FAILED',
      payment: { ...order.payment, attemptId: null },
    });
    const api = stubApi({
      [`GET ${path}`]: [200, failed],
      [`POST ${path}/payments`]: [200, order],
    });
    await renderWithRouter(<PaymentPage orderId={order.id} onConfirmed={() => {}} />, {
      queryClient: client(true),
    });
    expect(await screen.findByText(/The payment didn't go through/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Try paying again' }));
    expect(sentTo(api, `POST ${path}/payments`)).toHaveLength(1);
    expect(await screen.findByRole('button', { name: 'Pay ₹24,999' })).toBeTruthy();
  });

  it('D-57: when the hold ends we say the items went back to stock', async () => {
    stubApi({
      [`GET ${path}`]: [
        200,
        orderFixture({ status: 'cancelled', notice: 'HOLD_EXPIRED', holdExpiresAt: null }),
      ],
    });
    const { container } = await renderWithRouter(
      <PaymentPage orderId={order.id} onConfirmed={() => {}} />,
      { queryClient: client(true) },
    );
    expect(await screen.findByText(/went back to stock/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to your cart' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-59: a late payment with nothing left is refunded in full, and we say so', async () => {
    stubApi({
      [`GET ${path}`]: [
        200,
        orderFixture({ status: 'refunded', notice: 'REFUNDED_AFTER_EXPIRY', holdExpiresAt: null }),
      ],
    });
    await renderWithRouter(<PaymentPage orderId={order.id} onConfirmed={() => {}} />, {
      queryClient: client(true),
    });
    expect(await screen.findByText(/We refunded the full ₹24,999 automatically/)).toBeTruthy();
    expect(screen.getByText('Payment refunded')).toBeTruthy();
  });
});

describe('OrderConfirmedPage', () => {
  it('D-102: the confirmation shows items, delivery estimate, payment and the invoice; axe clean', async () => {
    const order = orderFixture({
      status: 'confirmed',
      holdExpiresAt: null,
      invoiceNumber: 'INV2627-000007',
      couponCode: 'WELCOME500',
      couponDiscountPaise: 50_000,
      subtotalPaise: 2_549_900,
    });
    stubApi({ [`GET /me/orders/${order.id}`]: [200, order] });
    const { container } = await renderWithRouter(<OrderConfirmedPage orderId={order.id} />, {
      queryClient: client(true),
    });
    expect(
      await screen.findByRole('heading', { name: 'Thank you, your order is confirmed' }),
    ).toBeTruthy();
    expect(screen.getByText('Order BN-000042 · UPI')).toBeTruthy();
    expect(screen.getByText('Thu, 8 – Fri, 9 Oct')).toBeTruthy();
    expect(screen.getByText('Coupon WELCOME500')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Download invoice INV2627-000007' }).getAttribute('href'),
    ).toBe(`/api/me/orders/${order.id}/invoice`);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-59: an order confirmed after the hold says why', async () => {
    const order = orderFixture({
      status: 'confirmed',
      holdExpiresAt: null,
      notice: 'CONFIRMED_AFTER_EXPIRY',
    });
    stubApi({ [`GET /me/orders/${order.id}`]: [200, order] });
    await renderWithRouter(<OrderConfirmedPage orderId={order.id} />, {
      queryClient: client(true),
    });
    expect(await screen.findByText(/the items were still available/)).toBeTruthy();
  });
});
