import { toCustomerId, type DeliveryCheck, type ItemFacts } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { emptyCartDeps } from '../../test/factories';
import type { BundleRow, ItemRow } from '../catalog/index';
import { createCartService } from './cart.service';

const product = (sku: string, name: string) => ({
  productId: `p-${sku}`,
  name,
  slug: name.toLowerCase().replaceAll(' ', '-'),
  sku,
  options: {},
  image: null,
  returnPolicy: 'return' as const,
});
const facts = (sku: string, over: Partial<ItemFacts> = {}): ItemFacts => ({
  kind: 'item',
  productId: `p-${sku}`,
  categoryId: 'audio',
  status: 'live',
  regularPaise: 100_000,
  unitsAvailable: 10,
  preorderCap: null,
  preorderSold: 0,
  flashSales: [],
  ...over,
});
const item = (sku: string, over: Partial<ItemFacts> = {}): ItemRow => ({
  key: `item:${sku}`,
  facts: facts(sku, over),
  product: product(sku, `Thing ${sku}`),
});
const kit: BundleRow = {
  key: 'bundle:kit',
  slug: 'kit',
  name: 'Kit',
  facts: {
    kind: 'bundle',
    pricePaise: 150_000,
    activeFrom: 0,
    activeTo: null,
    members: [
      { ...facts('A'), qty: 1 },
      { ...facts('B'), qty: 2 },
    ].map(({ productId, categoryId, status, regularPaise, unitsAvailable, qty }) => ({
      productId,
      categoryId,
      status,
      regularPaise,
      unitsAvailable,
      qty,
    })),
  },
  members: [
    { ...product('A', 'Thing A'), qty: 1 },
    { ...product('B', 'Thing B'), qty: 2 },
  ],
};
const deliverable = (
  sku: string,
  from: string,
  to: string,
  reasons: ('PINCODE' | 'PREORDER' | 'FLASH_SALE')[] = [],
): DeliveryCheck => ({
  pincode: '560034',
  place: { city: 'Bengaluru', state: 'Karnataka' },
  estimate: { status: 'deliverable', from, to, cod: { allowed: reasons.length === 0, reasons } },
});

describe('cart service', () => {
  const rows = [item('A'), item('B'), item('C')];
  const base = emptyCartDeps({
    loadItems: async (skus) => rows.filter((r) => skus.includes(r.product.sku)),
    loadBundles: async (slugs) => (slugs.includes('kit') ? [kit] : []),
  });

  it('D-55: a bundle line is checked per member (quantities multiplied) and arrives with the last one', async () => {
    const asked: [string, number][] = [];
    const service = createCartService({
      ...base,
      checkDelivery: async (sku, _pincode, qty) => {
        asked.push([sku, qty]);
        return sku === 'A'
          ? deliverable(sku, '2026-10-08', '2026-10-09')
          : deliverable(sku, '2026-10-09', '2026-10-12');
      },
    });
    const { cart } = await service.quote({
      lines: [{ key: 'bundle:kit', qty: 2 }],
      pincode: '560034',
    });
    expect(asked).toEqual([
      ['A', 2],
      ['B', 4],
    ]);
    expect(cart.lines[0]!.delivery).toEqual({
      status: 'deliverable',
      from: '2026-10-09',
      to: '2026-10-12',
    });
    expect(cart.canCheckout).toBe(true);
  });

  it('D-71: COD for the cart is off when any line blocks it, with every reason', async () => {
    const service = createCartService({
      ...base,
      checkDelivery: async (sku) =>
        sku === 'A'
          ? deliverable(sku, '2026-10-08', '2026-10-09', ['FLASH_SALE'])
          : deliverable(sku, '2026-10-08', '2026-10-09', ['PREORDER']),
    });
    const { cart } = await service.quote({
      lines: [
        { key: 'item:A', qty: 1 },
        { key: 'item:C', qty: 1 },
      ],
      pincode: '560034',
    });
    expect(cart.delivery).toEqual({
      pincode: '560034',
      place: { city: 'Bengaluru', state: 'Karnataka' },
      cod: { allowed: false, reasons: ['PREORDER', 'FLASH_SALE'] },
    });
  });

  it('D-198: lines that cannot be bought are not checked for delivery', async () => {
    let calls = 0;
    const service = createCartService({
      ...emptyCartDeps({
        loadItems: async () => [item('A', { status: 'discontinued' })],
      }),
      checkDelivery: async () => {
        calls++;
        return deliverable('A', '2026-10-08', '2026-10-09');
      },
    });
    const { cart } = await service.quote({ lines: [{ key: 'item:A', qty: 1 }], pincode: '560034' });
    expect(calls).toBe(0);
    expect(cart.lines[0]).toMatchObject({ status: 'unavailable', delivery: null });
    expect(cart.canCheckout).toBe(false);
  });

  it('D-193: a 21st line is refused', async () => {
    const many = Array.from({ length: 20 }, (_, i) => item(`S${i}`));
    const service = createCartService({
      ...base,
      loadItems: async (skus) => [...many, item('NEW')].filter((r) => skus.includes(r.product.sku)),
    });
    const lines = many.map((r) => ({ key: r.key, qty: 1 }));
    await expect(service.quote({ lines, add: { key: 'item:NEW', qty: 1 } })).rejects.toMatchObject({
      statusCode: 422,
      code: 'CART_FULL',
    });
  });

  it('D-195: a coupon that does not apply is refused and the cart keeps none', async () => {
    const service = createCartService(base);
    const me = toCustomerId('c1');
    await service.add(me, { key: 'item:A', qty: 1 });
    await expect(service.applyCoupon(me, 'NOPE')).rejects.toMatchObject({
      statusCode: 422,
      code: 'COUPON_NOT_APPLICABLE',
      message: "This code isn't valid or has ended.",
    });
    expect((await service.get(me)).coupon).toBeNull();
  });
});
