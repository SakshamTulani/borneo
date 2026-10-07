import { eq } from 'drizzle-orm';
import { orderViewSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { product, variant } from '../../db/schema/index';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';
import { headerSession, insertShopper, placeViaApi, putInCart } from '../../test/factories';

const db = useTestDb('orders');
const app = testApp(db, { session: headerSession, demoMode: true });

describe('pre-orders', () => {
  it('D-233: the order shows the dispatch range as it stands now', async () => {
    const [row] = await db
      .select({
        sku: variant.sku,
        productId: product.id,
        from: product.dispatchFrom,
        to: product.dispatchTo,
      })
      .from(variant)
      .innerJoin(product, eq(product.id, variant.productId))
      .where(eq(product.status, 'preorder'))
      .limit(1);
    const shopper = await insertShopper(db);
    await putInCart(db, shopper.customerId, `item:${row!.sku}`);
    const order = await placeViaApi(app, shopper, 'upi', { pay: true });
    expect(order.status).toBe('confirmed');
    expect(order.preorderDispatch).not.toBeNull();

    await db
      .update(product)
      .set({ dispatchFrom: '2027-01-10', dispatchTo: '2027-01-20' })
      .where(eq(product.id, row!.productId));
    const later = orderViewSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/me/orders/${order.id}`,
          headers: { 'x-test-customer': shopper.customerId },
        })
      ).json(),
    );
    // Put the seeded dates back: other suites read this product.
    await db
      .update(product)
      .set({ dispatchFrom: row!.from, dispatchTo: row!.to })
      .where(eq(product.id, row!.productId));
    expect(later.preorderDispatch).toEqual({ from: '2027-01-10', to: '2027-01-20' });
  });
});
