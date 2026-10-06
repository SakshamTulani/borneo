import {
  cartAddResultSchema,
  cartQuoteResponseSchema,
  cartViewSchema,
  productDetailSchema,
  type CartView,
} from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { TEST_ORIGIN, testApp } from '../../test/app';
import { useTestDb } from '../../test/db';
import { headerSession, insertCustomer } from '../../test/factories';

const db = useTestDb();
const app = testApp(db, { session: headerSession });
const as = (customer: string) => ({ 'x-test-customer': customer });

const quoteSchema = cartQuoteResponseSchema;

async function quote(payload: object) {
  const res = await app.inject({ method: 'POST', url: '/cart/quote', payload });
  return { res, body: res.statusCode === 200 ? quoteSchema.parse(res.json()) : null };
}

async function call(
  customer: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  payload?: object,
) {
  return app.inject({ method, url, headers: as(customer), ...(payload ? { payload } : {}) });
}

async function cartOf(customer: string, query = ''): Promise<CartView> {
  const res = await call(customer, 'GET', `/me/cart${query}`);
  expect(res.statusCode, res.body).toBe(200);
  return cartViewSchema.parse(res.json());
}

async function add(customer: string, key: string, qty = 1) {
  const res = await call(customer, 'POST', '/me/cart/lines', { key, qty });
  expect(res.statusCode, res.body).toBe(200);
  return cartAddResultSchema.parse(res.json());
}

const line = (cart: CartView, key: string) => cart.lines.find((l) => l.key === key)!;

describe('POST /cart/quote (browser cart, D-192)', () => {
  it('D-194: prices one Echo Buds 2 Black unit at the live flash price and the rest at the regular price', async () => {
    const { res, body } = await quote({
      lines: [
        { key: 'item:EB2-BLK', qty: 2 },
        { key: 'item:BP4-6-128-FOR', qty: 1 },
      ],
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    const buds = line(body!.cart, 'item:EB2-BLK');
    expect(buds.flash).toMatchObject({ unitPricePaise: 279_900 });
    expect(buds.unitPricePaise).toBe(349_900);
    expect(buds.linePaise).toBe(279_900 + 349_900);
    expect(buds.product).toMatchObject({ name: 'Echo Buds 2', options: { colour: 'Black' } });
    expect(body!.cart.subtotalPaise).toBe(279_900 + 349_900 + 1_499_900);
    expect(body!.cart.count).toBe(3);
    expect(body!.cart.canCheckout).toBe(true);
    expect(body!.added).toBeNull();
  });

  it('D-193: merges repeated lines, caps at 5 and drops keys that name nothing', async () => {
    const { body } = await quote({
      lines: [
        { key: 'item:EB2-SGE', qty: 4 },
        { key: 'item:EB2-SGE', qty: 4 },
        { key: 'item:NO-SUCH-SKU', qty: 1 },
      ],
    });
    expect(body!.cart.lines.map((l) => [l.key, l.qty])).toEqual([['item:EB2-SGE', 5]]);
  });

  it('D-199: adding returns up to 3 add-on suggestions with reasons, none already in the cart', async () => {
    const { body } = await quote({ lines: [], add: { key: 'item:BP4-6-128-FOR', qty: 1 } });
    expect(body!.cart.lines.map((l) => l.key)).toEqual(['item:BP4-6-128-FOR']);
    const { suggestions } = body!.added!;
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    for (const s of suggestions) {
      expect(s.reason.length).toBeGreaterThan(0);
      if (s.addKey) expect(s.addKey).toMatch(/^item:/);
      expect(s.product.slug).not.toBe('pulse-4');
    }
  });

  it('D-198: refuses to add what is not sold, out of stock or unknown', async () => {
    expect(
      (await quote({ lines: [], add: { key: 'item:BP3-6-128-GRA', qty: 1 } })).res.json(),
    ).toMatchObject({
      error: { code: 'NOT_FOR_SALE' },
    });
    const out = await quote({ lines: [], add: { key: 'item:BM1-COR', qty: 1 } });
    expect(out.res.statusCode).toBe(409);
    expect(out.res.json().error.code).toBe('OUT_OF_STOCK');
    expect((await quote({ lines: [], add: { key: 'item:NOPE', qty: 1 } })).res.statusCode).toBe(
      404,
    );
    expect((await quote({ lines: [], add: { key: 'not a key', qty: 1 } })).res.statusCode).toBe(
      400,
    );
  });

  it('D-198: a discontinued line stays listed, out of the totals, and holds checkout', async () => {
    const { body } = await quote({
      lines: [
        { key: 'item:BP3-6-128-GRA', qty: 1 },
        { key: 'item:EB2-SGE', qty: 1 },
      ],
    });
    expect(line(body!.cart, 'item:BP3-6-128-GRA')).toMatchObject({
      status: 'unavailable',
      linePaise: 0,
    });
    expect(body!.cart.subtotalPaise).toBe(349_900);
    expect(body!.cart.canCheckout).toBe(false);
  });

  it('D-36, D-195: a coupon applies to regular lines only; the reason shows when nothing qualifies', async () => {
    const applied = await quote({
      lines: [{ key: 'item:EB2-SGE', qty: 1 }],
      couponCode: 'audio10',
    });
    expect(applied.body!.cart.coupon).toEqual({
      status: 'applied',
      code: 'AUDIO10',
      name: '10% off audio, up to ₹1,000',
      discountPaise: 34_990,
    });
    const flashOnly = await quote({
      lines: [{ key: 'item:EB2-BLK', qty: 1 }],
      couponCode: 'AUDIO10',
    });
    expect(flashOnly.body!.cart.coupon).toMatchObject({ status: 'notApplied' });
    expect(flashOnly.body!.cart.totalPaise).toBe(279_900);
  });

  it('D-196: lists payment offers with what they would save, none applied', async () => {
    const { body } = await quote({ lines: [{ key: 'item:BP4-6-128-FOR', qty: 1 }] });
    const cart = body!.cart;
    expect(cart.totalPaise).toBe(1_499_900);
    expect(cart.paymentOffers.map((o) => o.kind).sort()).toEqual(['bank', 'bank', 'noCostEmi']);
    const icici = cart.paymentOffers.find((o) => o.name.includes('ICICI'))!;
    expect(icici).toMatchObject({ savingPaise: 75_000, reason: null });
    const hdfc = cart.paymentOffers.find((o) => o.name.includes('HDFC'))!;
    expect(hdfc).toMatchObject({ savingPaise: null, reason: 'On orders of ₹15,000 or more.' });
    expect(cart.emiFromPaise).toBeGreaterThan(0);
    expect(cart.coupons.map((c) => c.code)).toEqual(
      expect.arrayContaining(['WELCOME500', 'AUDIO10']),
    );
  });

  it('D-55, D-71: delivery per line and COD for the whole cart at a pincode', async () => {
    const { body } = await quote({
      lines: [{ key: 'item:BP4-6-128-FOR', qty: 1 }],
      pincode: '560034',
    });
    expect(line(body!.cart, 'item:BP4-6-128-FOR').delivery).toMatchObject({
      status: 'deliverable',
    });
    expect(body!.cart.delivery).toMatchObject({
      pincode: '560034',
      place: { city: 'Bengaluru' },
      cod: { allowed: true, reasons: [] },
    });
    const flash = await quote({ lines: [{ key: 'item:EB2-BLK', qty: 1 }], pincode: '560034' });
    expect(flash.body!.cart.delivery!.cod).toEqual({ allowed: false, reasons: ['FLASH_SALE'] });
  });

  it('D-51: a line that cannot reach the pincode holds checkout', async () => {
    const { body } = await quote({ lines: [{ key: 'item:TV-V43', qty: 1 }], pincode: '744101' });
    expect(line(body!.cart, 'item:TV-V43').delivery).toEqual({ status: 'notDeliverable' });
    expect(body!.cart.canCheckout).toBe(false);
  });

  it('D-37, D-197: a bundle is one line at the bundle price; coupons skip it', async () => {
    const { body } = await quote({
      lines: [{ key: 'bundle:pulse-4-audio-pack', qty: 1 }],
      couponCode: 'WELCOME500',
    });
    const bundle = line(body!.cart, 'bundle:pulse-4-audio-pack');
    expect(bundle).toMatchObject({
      kind: 'bundle',
      name: 'Pulse 4 + Echo Buds 2',
      unitPricePaise: 1_749_900,
      product: null,
    });
    expect(bundle.members.map((m) => m.sku)).toEqual(['BP4-6-128-FOR', 'EB2-SGE']);
    expect(bundle.members[0]!.returnPolicy).toMatch(/Replacement within 7 days/);
    expect(bundle.members[1]!.returnPolicy).toMatch(/Return within 7 days/);
    expect(body!.cart.coupon).toMatchObject({ status: 'notApplied' });
    expect(body!.cart.totalPaise).toBe(1_749_900);
  });
});

describe('GET /products/:slug bundles (D-197)', () => {
  it('shows the Pulse 4 bundle with its real saving against regular prices', async () => {
    const res = await app.inject({ method: 'GET', url: '/products/pulse-4' });
    const product = productDetailSchema.parse(res.json());
    expect(product.bundles).toEqual([
      expect.objectContaining({
        key: 'bundle:pulse-4-audio-pack',
        pricePaise: 1_749_900,
        separatePaise: 1_499_900 + 349_900,
        savingPaise: 99_900,
      }),
    ]);
  });
});

describe('/me/cart (account cart)', () => {
  it('needs a signed-in customer', async () => {
    expect((await app.inject({ method: 'GET', url: '/me/cart' })).statusCode).toBe(401);
    const res = await app.inject({
      method: 'POST',
      url: '/me/cart/lines',
      payload: { key: 'item:EB2-SGE', qty: 1 },
    });
    expect(res.statusCode).toBe(401);
  });

  it('adds, changes, removes and keeps lines in the order they were added', async () => {
    const me = await insertCustomer(db);
    expect((await cartOf(me)).lines).toEqual([]);
    await add(me, 'item:EB2-SGE');
    const { cart, added } = await add(me, 'item:BP4-6-128-FOR');
    expect(cart.lines.map((l) => l.key)).toEqual(['item:EB2-SGE', 'item:BP4-6-128-FOR']);
    expect(added.key).toBe('item:BP4-6-128-FOR');
    // D-199: nothing already in the cart is suggested.
    expect(added.suggestions.map((s) => s.product.slug)).not.toContain('echo-buds-2');

    const patched = await call(me, 'PATCH', '/me/cart/lines/item:EB2-SGE', { qty: 3 });
    expect(line(cartViewSchema.parse(patched.json()), 'item:EB2-SGE').qty).toBe(3);
    const removed = await call(me, 'DELETE', '/me/cart/lines/item:EB2-SGE');
    expect(cartViewSchema.parse(removed.json()).lines.map((l) => l.key)).toEqual([
      'item:BP4-6-128-FOR',
    ]);
    expect((await call(me, 'DELETE', '/me/cart/lines/item:EB2-SGE')).statusCode).toBe(404);
    expect((await call(me, 'PATCH', '/me/cart/lines/item:EB2-SGE', { qty: 6 })).statusCode).toBe(
      400,
    );
  });

  it('D-193: adding past 5 units caps the line; adding beyond what we can supply is refused', async () => {
    const me = await insertCustomer(db);
    await add(me, 'item:EB2-SGE', 4);
    const { cart } = await add(me, 'item:EB2-SGE', 4);
    expect(line(cart, 'item:EB2-SGE').qty).toBe(5);
    // The Vista 65 OLED has 4 units across warehouses.
    const short = await call(me, 'POST', '/me/cart/lines', { key: 'item:TV-V65O', qty: 5 });
    expect(short.statusCode).toBe(409);
    expect(short.json().error.code).toBe('NOT_ENOUGH_STOCK');
    expect((await cartOf(me)).lines.map((l) => l.key)).toEqual(['item:EB2-SGE']);
  });

  it('D-195: a coupon that does not qualify is refused and not kept; a kept one that stops qualifying stays, not applied', async () => {
    const me = await insertCustomer(db);
    await add(me, 'item:BP4-6-128-FOR');
    const refused = await call(me, 'PUT', '/me/cart/coupon', { code: 'AUDIO10' });
    expect(refused.statusCode).toBe(422);
    expect(refused.json().error).toMatchObject({
      code: 'COUPON_NOT_APPLICABLE',
      message: expect.stringContaining('Nothing in your cart'),
    });
    expect((await cartOf(me)).coupon).toBeNull();

    const applied = await call(me, 'PUT', '/me/cart/coupon', { code: 'welcome500' });
    expect(cartViewSchema.parse(applied.json()).coupon).toMatchObject({
      status: 'applied',
      code: 'WELCOME500',
      discountPaise: 50_000,
    });

    await add(me, 'item:EB2-SGE');
    await call(me, 'DELETE', '/me/cart/lines/item:BP4-6-128-FOR');
    const kept = await cartOf(me);
    expect(kept.coupon).toEqual({
      status: 'notApplied',
      code: 'WELCOME500',
      reason: 'Add ₹1,500 more of eligible items to use this coupon.',
    });
    await add(me, 'item:BP4-6-128-FOR');
    expect((await cartOf(me)).coupon).toMatchObject({ status: 'applied' });

    const cleared = await call(me, 'DELETE', '/me/cart/coupon');
    expect(cartViewSchema.parse(cleared.json()).coupon).toBeNull();
  });

  it('D-192: merges the browser cart into the account cart at sign-in', async () => {
    const me = await insertCustomer(db);
    await add(me, 'item:EB2-SGE', 2);
    const res = await call(me, 'POST', '/me/cart/merge', {
      lines: [
        { key: 'item:EB2-SGE', qty: 1 },
        { key: 'bundle:pulse-4-audio-pack', qty: 1 },
        { key: 'item:GONE-SKU', qty: 1 },
      ],
      couponCode: 'AUDIO10',
    });
    expect(res.statusCode, res.body).toBe(200);
    const cart = cartViewSchema.parse(res.json());
    expect(cart.lines.map((l) => [l.key, l.qty])).toEqual([
      ['item:EB2-SGE', 3],
      ['bundle:pulse-4-audio-pack', 1],
    ]);
    expect(cart.coupon).toMatchObject({ status: 'applied', code: 'AUDIO10' });
  });

  it('D-193: parallel adds of different lines all land (writes are serialised per cart)', async () => {
    const me = await insertCustomer(db);
    const keys = [
      'item:EB2-SGE',
      'item:BP4-6-128-FOR',
      'item:WS1-BLK',
      'item:BM2-BLK',
      'item:EM1-BLK',
    ];
    const results = await Promise.all(
      keys.map((key) => call(me, 'POST', '/me/cart/lines', { key, qty: 1 })),
    );
    for (const r of results) expect(r.statusCode, r.body).toBe(200);
    expect((await cartOf(me)).lines.map((l) => l.key).sort()).toEqual([...keys].sort());
  });

  it('refuses cookie-authenticated writes from another site', async () => {
    const me = await insertCustomer(db);
    const res = await app.inject({
      method: 'POST',
      url: '/me/cart/lines',
      headers: { ...as(me), origin: 'https://evil.example', cookie: 'borneo.session_token=x' },
      payload: { key: 'item:EB2-SGE', qty: 1 },
    });
    expect(res.statusCode).toBe(403);
    const ok = await app.inject({
      method: 'POST',
      url: '/me/cart/lines',
      headers: { ...as(me), origin: TEST_ORIGIN },
      payload: { key: 'item:EB2-SGE', qty: 1 },
    });
    expect(ok.statusCode).toBe(200);
  });
});
