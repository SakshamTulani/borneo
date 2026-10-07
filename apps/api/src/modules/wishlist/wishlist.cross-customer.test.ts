import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { product } from '../../db/schema/index';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import { headerSession, insertTwoCustomers } from '../../test/factories';
import {
  addToWishlist,
  findWishlistTarget,
  listWishlist,
  listWishlistSlugs,
  removeFromWishlist,
} from './wishlist.repository';

const db = useTestDb();

describe('wishlists are scoped to their customer (D-96)', () => {
  it("another customer never sees or changes the owner's wishlist", async () => {
    const { owner, other } = await insertTwoCustomers(db);
    const [p] = await db
      .select({ id: product.id })
      .from(product)
      .where(eq(product.slug, 'pulse-4'));
    await addToWishlist(owner, db, p!.id, TEST_NOW, 200);
    expect(await listWishlistSlugs(other, db)).toEqual([]);
    expect((await listWishlist(other, db, { limit: 10 })).total).toBe(0);
    expect((await findWishlistTarget(other, db, 'pulse-4'))!.saved).toBe(false);
    await removeFromWishlist(other, db, p!.id);
    expect(await listWishlistSlugs(owner, db)).toEqual(['pulse-4']);
    const app = testApp(db, { session: headerSession });
    const res = await app.inject({
      method: 'DELETE',
      url: '/me/wishlist/pulse-4',
      headers: { 'x-test-customer': other },
    });
    expect(res.json()).toEqual({ slugs: [] });
    expect(await listWishlistSlugs(owner, db)).toEqual(['pulse-4']);
  });
});
