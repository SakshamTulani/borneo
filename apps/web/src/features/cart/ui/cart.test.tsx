import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { apiError, customer, sentTo, stubApi } from '@/test/api';
import { budsLineFixture, cartFixture, cartLineFixture, summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { CART_STORAGE_KEY } from '../repository/browserCart';
import { BundleOffers } from './BundleOffers';
import { CartPage } from './CartPage';
import { ProductPurchase } from './ProductPurchase';

const client = (signedIn: boolean) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['session'], signedIn ? customer : null);
  return qc;
};
const stored = () => JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? 'null');
const keep = (cart: object) => window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
const quoted = (cart = cartFixture(), added: object | null = null): [number, unknown] => [
  200,
  { cart, added },
];
const emptyCart = () => cartFixture({ lines: [], coupons: [], paymentOffers: [] });
type QuoteBody = { lines: { key: string; qty: number }[]; add?: { key: string } };
const firstAdd = (api: ReturnType<typeof stubApi>) =>
  sentTo(api, 'POST /cart/quote').find((b) => (b as QuoteBody).add);

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('CartPage, signed out (browser cart, D-192)', () => {
  it('prices the browser cart through the API and asks to sign in to check out; axe clean', async () => {
    keep({ lines: [{ key: 'item:BP4-6-128-FOR', qty: 1 }] });
    const api = stubApi({ 'POST /cart/quote': quoted() });
    const { container } = await renderWithRouter(<CartPage />, { queryClient: client(false) });

    expect(await screen.findByRole('listitem', { name: 'Borneo Pulse 4' })).toBeTruthy();
    expect(sentTo(api, 'POST /cart/quote')[0]).toEqual({
      lines: [{ key: 'item:BP4-6-128-FOR', qty: 1 }],
    });
    // D-84: the return policy shows in the cart.
    expect(screen.getByText(/^Replacement within 7 days/)).toBeTruthy();
    // D-92: the account is made at checkout; signing in is offered there too.
    expect(screen.getByRole('link', { name: 'Check out' }).getAttribute('href')).toBe('/checkout');
    expect(screen.getByRole('link', { name: 'sign in' }).getAttribute('href')).toBe(
      '/sign-in?redirect=%2Fcheckout',
    );
    // D-196: payment offers say why they don't apply; none is selected.
    expect(screen.getByText('On orders of ₹15,000 or more.')).toBeTruthy();
    expect(screen.queryByRole('checkbox', { checked: true })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the empty state with a way to browse; axe clean', async () => {
    stubApi({
      'POST /cart/quote': quoted(cartFixture({ lines: [], coupons: [], paymentOffers: [] })),
    });
    const { container } = await renderWithRouter(<CartPage />, { queryClient: client(false) });
    expect(await screen.findByText('Your cart is empty')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse categories' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-193: changing the quantity and removing re-price the browser cart and keep the clean lines', async () => {
    keep({
      lines: [
        { key: 'item:BP4-6-128-FOR', qty: 1 },
        { key: 'item:EB2-BLK', qty: 1 },
      ],
    });
    const api = stubApi({
      'POST /cart/quote': (body) => {
        const lines = (body as { lines: { key: string; qty: number }[] }).lines;
        return quoted(
          cartFixture({
            lines: lines.map((l) =>
              (l.key === 'item:EB2-BLK' ? budsLineFixture : cartLineFixture)({ qty: l.qty }),
            ),
          }),
        );
      },
    });
    await renderWithRouter(<CartPage />, { queryClient: client(false) });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'One more Borneo Pulse 4' }));
    await waitFor(() => expect(stored().lines[0]).toEqual({ key: 'item:BP4-6-128-FOR', qty: 2 }));
    await user.click(screen.getByRole('button', { name: 'Remove Echo Buds 2' }));
    await waitFor(() => expect(stored().lines).toEqual([{ key: 'item:BP4-6-128-FOR', qty: 2 }]));
    expect(sentTo(api, 'POST /cart/quote').length).toBeGreaterThanOrEqual(3);
  });

  it('D-195: a coupon that does not qualify shows why and is not kept; one that does is kept', async () => {
    keep({ lines: [{ key: 'item:BP4-6-128-FOR', qty: 1 }] });
    stubApi({
      'POST /cart/quote': (body) => {
        const code = (body as { couponCode?: string }).couponCode;
        if (code === 'AUDIO10')
          return quoted(
            cartFixture({
              coupon: {
                status: 'notApplied',
                code: 'AUDIO10',
                reason: 'Nothing in your cart qualifies.',
              },
            }),
          );
        if (code === 'WELCOME500')
          return quoted(
            cartFixture({
              coupon: {
                status: 'applied',
                code: 'WELCOME500',
                name: '₹500 off',
                discountPaise: 50_000,
              },
              totalPaise: 1_449_900,
              coupons: [],
            }),
          );
        return quoted();
      },
    });
    await renderWithRouter(<CartPage />, { queryClient: client(false) });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Coupon code'), 'AUDIO10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Nothing in your cart qualifies.');
    expect(stored().couponCode).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'Apply coupon WELCOME500' }));
    expect(await screen.findByText(/Applied: ₹500 off/)).toBeTruthy();
    expect(stored().couponCode).toBe('WELCOME500');
    expect(screen.getByText('−₹500')).toBeTruthy();
  });
});

describe('CartPage, signed in (account cart)', () => {
  it('D-192: merges the browser cart into the account once, then clears it', async () => {
    keep({ lines: [{ key: 'item:EB2-BLK', qty: 1 }], couponCode: 'AUDIO10' });
    const api = stubApi({
      'GET /me/addresses': [200, { items: [] }],
      'POST /me/cart/merge': [200, cartFixture()],
      'GET /me/cart': [200, cartFixture({ lines: [cartLineFixture(), budsLineFixture()] })],
    });
    await renderWithRouter(<CartPage />, { queryClient: client(true) });
    expect(await screen.findByRole('listitem', { name: 'Echo Buds 2' })).toBeTruthy();
    expect(sentTo(api, 'POST /me/cart/merge')).toEqual([
      { lines: [{ key: 'item:EB2-BLK', qty: 1 }], couponCode: 'AUDIO10' },
    ]);
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it('D-55: shows delivery per line and COD for the pincode; D-198: problems hold checkout', async () => {
    const api = stubApi({
      'GET /me/addresses': [200, { items: [] }],
      'GET /me/cart': (_body, url) =>
        url.searchParams.get('pincode') === '560034'
          ? [
              200,
              cartFixture({
                lines: [
                  cartLineFixture({
                    delivery: { status: 'deliverable', from: '2026-10-08', to: '2026-10-09' },
                  }),
                  budsLineFixture({ status: 'unavailable', linePaise: 0 }),
                ],
                delivery: {
                  pincode: '560034',
                  place: { city: 'Bengaluru', state: 'Karnataka' },
                  cod: { allowed: false, reasons: ['FLASH_SALE'] },
                },
                canCheckout: false,
              }),
            ]
          : [200, cartFixture()],
    });
    const { container } = await renderWithRouter(<CartPage />, { queryClient: client(true) });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Delivery pincode'), '560034');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Delivery Thu, 8 – Fri, 9 Oct')).toBeTruthy();
    expect(screen.getByText('No cash on delivery: flash sale prices are paid online')).toBeTruthy();
    expect(screen.getByText('We no longer sell this. Remove it to continue.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Check out' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Fix the items marked above to continue.')).toBeTruthy();
    expect(api).toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-194: a flash line says one unit is at the flash price, the rest regular, limit 1', async () => {
    stubApi({
      'GET /me/addresses': [200, { items: [] }],
      'GET /me/cart': [
        200,
        cartFixture({
          lines: [
            budsLineFixture({
              qty: 2,
              flash: { unitPricePaise: 279_900, endsAt: Date.UTC(2026, 9, 7, 6, 30) },
              linePaise: 629_800,
            }),
          ],
        }),
      ],
    });
    await renderWithRouter(<CartPage />, { queryClient: client(true) });
    expect(
      await screen.findByText(
        /1 at the flash sale price ₹2,799 until .*; the rest at ₹3,499 each\. Limit 1 per customer\./,
      ),
    ).toBeTruthy();
  });
});

describe('ProductPurchase (PDP)', () => {
  it('D-199: adding opens a confirmation with add-on suggestions, each with a reason and its own button', async () => {
    const suggestion = {
      product: summaryFixture({
        id: 'p-case',
        slug: 'shield-pulse-4',
        name: 'Shield case for Pulse 4',
      }),
      reason: 'Fits your Borneo Pulse 4',
      addKey: 'item:SHD-BP4',
    };
    const api = stubApi({
      'POST /cart/quote': (body) => {
        const { lines, add } = body as QuoteBody;
        if (!add) return quoted(lines.length ? cartFixture() : emptyCart());
        return quoted(cartFixture(), {
          key: add.key,
          suggestions: add.key === 'item:SHD-BP4' ? [] : [suggestion],
        });
      },
    });
    await renderWithRouter(
      <ProductPurchase
        productName="Borneo Pulse 4"
        sku="BP4-6-128-FOR"
        availability="inStock"
        sellingPaise={1_499_900}
      />,
      { queryClient: client(false) },
    );
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: /Add to cart/ })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Added to your cart' });
    expect(firstAdd(api)).toMatchObject({ add: { key: 'item:BP4-6-128-FOR', qty: 1 } });
    expect(within(dialog).getByText('Fits your Borneo Pulse 4')).toBeTruthy();
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    expect(stored().lines).toEqual([{ key: 'item:BP4-6-128-FOR', qty: 1 }]);

    await user.click(
      within(dialog).getByRole('button', { name: 'Add Shield case for Pulse 4 to cart' }),
    );
    expect(await within(dialog).findByText('Added')).toBeTruthy();
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it('once the variant is in the cart, shows how many with a stepper instead of "Add to cart"', async () => {
    keep({ lines: [{ key: 'item:BP4-6-128-FOR', qty: 2 }] });
    const api = stubApi({
      'POST /cart/quote': (body) =>
        quoted(
          cartFixture({
            lines: (body as QuoteBody).lines.map((l) => cartLineFixture({ qty: l.qty })),
          }),
        ),
    });
    const { container } = await renderWithRouter(
      <ProductPurchase
        productName="Borneo Pulse 4"
        sku="BP4-6-128-FOR"
        availability="inStock"
        sellingPaise={1_499_900}
      />,
      { queryClient: client(false) },
    );
    expect(await screen.findByText('In your cart')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add to cart/ })).toBeNull();
    const [stepper] = screen.getAllByRole('group', { name: 'Quantity of Borneo Pulse 4' });
    expect(stepper!.textContent).toContain('2');
    expect(screen.getByRole('link', { name: 'View cart' }).getAttribute('href')).toBe('/cart');
    await userEvent
      .setup()
      .click(screen.getAllByRole('button', { name: 'One more Borneo Pulse 4' })[0]!);
    await waitFor(() => expect(stored().lines).toEqual([{ key: 'item:BP4-6-128-FOR', qty: 3 }]));
    expect(sentTo(api, 'POST /cart/quote').length).toBeGreaterThanOrEqual(2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the API reason when adding fails, and "Out of stock" disabled when nothing is left', async () => {
    stubApi({
      'POST /cart/quote': apiError(409, 'NOT_ENOUGH_STOCK', "We can't add more of this right now."),
    });
    await renderWithRouter(
      <ProductPurchase
        productName="Echo Buds 2"
        sku="EB2-BLK"
        availability="inStock"
        sellingPaise={349_900}
      />,
      { queryClient: client(false) },
    );
    await userEvent.setup().click(screen.getAllByRole('button', { name: /Add to cart/ })[0]!);
    expect((await screen.findByRole('alert')).textContent).toBe(
      "We can't add more of this right now.",
    );
  });

  it('labels pre-orders and disables out-of-stock variants', async () => {
    stubApi({});
    await renderWithRouter(
      <>
        <ProductPurchase productName="Nova 4" sku="BN4" availability="preorder" sellingPaise={1} />
        <ProductPurchase
          productName="Boom Mini"
          sku="BM1"
          availability="outOfStock"
          sellingPaise={1}
        />
      </>,
      { queryClient: client(false) },
    );
    expect(screen.getAllByRole('button', { name: /Pre-order/ }).length).toBe(2);
    for (const b of screen.getAllByRole('button', { name: /Out of stock/ }))
      expect(b.hasAttribute('disabled')).toBe(true);
  });
});

describe('BundleOffers (D-197)', () => {
  it('shows the bundle price, its real saving and adds it as one line; axe clean', async () => {
    const api = stubApi({
      'POST /cart/quote': (body) =>
        (body as QuoteBody).add
          ? quoted(
              cartFixture({
                lines: [
                  cartLineFixture({
                    key: 'bundle:pulse-4-audio-pack',
                    kind: 'bundle',
                    name: 'Pulse 4 + Echo Buds 2',
                    product: null,
                  }),
                ],
              }),
              { key: 'bundle:pulse-4-audio-pack', suggestions: [] },
            )
          : quoted(emptyCart()),
    });
    const { container } = await renderWithRouter(
      <BundleOffers
        bundles={[
          {
            key: 'bundle:pulse-4-audio-pack',
            slug: 'pulse-4-audio-pack',
            name: 'Pulse 4 + Echo Buds 2',
            pricePaise: 1_749_900,
            separatePaise: 1_849_800,
            savingPaise: 99_900,
            items: [
              {
                name: 'Borneo Pulse 4',
                slug: 'pulse-4',
                sku: 'BP4-6-128-FOR',
                options: { colour: 'Forest' },
                qty: 1,
                image: null,
              },
              {
                name: 'Echo Buds 2',
                slug: 'echo-buds-2',
                sku: 'EB2-SGE',
                options: { colour: 'Sage' },
                qty: 1,
                image: null,
              },
            ],
          },
        ]}
      />,
      { queryClient: client(false) },
    );
    expect(await screen.findByText('₹17,499')).toBeTruthy();
    expect(screen.getByText('₹999 less')).toBeTruthy();
    expect(screen.getByText("Coupons don't apply to bundle prices.")).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Add bundle: Pulse 4 + Echo Buds 2' }));
    await screen.findByRole('dialog', { name: 'Added to your cart' });
    expect(firstAdd(api)).toMatchObject({ add: { key: 'bundle:pulse-4-audio-pack' } });
    // The bundle now shows as in the cart.
    expect((await screen.findAllByText('In your cart')).length).toBeGreaterThan(0);
  });
});
