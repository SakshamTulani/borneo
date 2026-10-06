import { cartViewSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';
import { headerSession, insertTwoCustomers } from '../../test/factories';
import { changeCart, readCart } from './cart.repository';

const db = useTestDb();
const app = testApp(db, { session: headerSession });

describe('carts are scoped to their customer (D-96)', () => {
  it("another customer's cart writes never touch the owner's cart", async () => {
    const { owner, other } = await insertTwoCustomers(db);
    await changeCart(owner, db, () => ({
      entries: [{ key: 'item:EB2-SGE', qty: 2 }],
      couponCode: 'AUDIO10',
    }));
    expect(await readCart(other, db)).toEqual({ entries: [], couponCode: undefined });

    await changeCart(other, db, () => ({
      entries: [{ key: 'item:BP4-6-128-FOR', qty: 1 }],
      couponCode: undefined,
    }));
    expect(await readCart(owner, db)).toEqual({
      entries: [{ key: 'item:EB2-SGE', qty: 2 }],
      couponCode: 'AUDIO10',
    });
  });

  it("routes only ever read and change the signed-in customer's cart", async () => {
    const { owner, other } = await insertTwoCustomers(db);
    await changeCart(owner, db, () => ({
      entries: [{ key: 'item:EB2-SGE', qty: 1 }],
      couponCode: undefined,
    }));
    const as = (c: string) => ({ 'x-test-customer': c });

    const theirs = await app.inject({ method: 'GET', url: '/me/cart', headers: as(other) });
    expect(cartViewSchema.parse(theirs.json()).lines).toEqual([]);
    const del = await app.inject({
      method: 'DELETE',
      url: '/me/cart/lines/item:EB2-SGE',
      headers: as(other),
    });
    expect(del.statusCode).toBe(404);
    const patch = await app.inject({
      method: 'PATCH',
      url: '/me/cart/lines/item:EB2-SGE',
      headers: as(other),
      payload: { qty: 5 },
    });
    expect(patch.statusCode).toBe(404);
    expect((await readCart(owner, db)).entries).toEqual([{ key: 'item:EB2-SGE', qty: 1 }]);
  });
});
