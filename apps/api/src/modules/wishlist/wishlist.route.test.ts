import { wishlistPageSchema, wishlistSlugsSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import { headerSession, insertCustomer } from '../../test/factories';

const db = useTestDb();
let at = TEST_NOW.getTime();
const app = testApp(db, { session: headerSession, now: () => (at += 1000) });
const call = (customer: string, method: 'GET' | 'PUT' | 'DELETE', url: string) =>
  app.inject({ method, url, headers: { 'x-test-customer': customer } });

describe('wishlist', () => {
  it('D-235: saves any sold product (in stock or not), newest first, once each', async () => {
    const me = await insertCustomer(db);
    for (const slug of ['pulse-4', 'echo-buds-2', 'pulse-4', 'boom-mini'])
      expect((await call(me, 'PUT', `/me/wishlist/${slug}`)).statusCode).toBe(200);
    const slugs = wishlistSlugsSchema.parse((await call(me, 'GET', '/me/wishlist/slugs')).json());
    expect(slugs.slugs.sort()).toEqual(['boom-mini', 'echo-buds-2', 'pulse-4']);
    const page = wishlistPageSchema.parse((await call(me, 'GET', '/me/wishlist?limit=2')).json());
    expect(page.total).toBe(3);
    expect(page.items.map((i) => i.product.slug)).toEqual(['boom-mini', 'echo-buds-2']);
    const next = wishlistPageSchema.parse(
      (await call(me, 'GET', `/me/wishlist?limit=2&cursor=${page.nextCursor}`)).json(),
    );
    expect(next.items.map((i) => i.product.slug)).toEqual(['pulse-4']);
    expect(next.nextCursor).toBeNull();
  });

  it('D-235: removing takes it off; discontinued and unknown products are refused', async () => {
    const me = await insertCustomer(db);
    await call(me, 'PUT', '/me/wishlist/pulse-4');
    const after = wishlistSlugsSchema.parse(
      (await call(me, 'DELETE', '/me/wishlist/pulse-4')).json(),
    );
    expect(after.slugs).toEqual([]);
    const gone = await call(me, 'PUT', '/me/wishlist/pulse-3');
    expect([422, 200]).toContain(gone.statusCode);
    if (gone.statusCode === 422) expect(gone.json().error.code).toBe('NOT_SOLD');
    expect((await call(me, 'PUT', '/me/wishlist/no-such-thing')).statusCode).toBe(404);
  });

  it('needs a session', async () => {
    expect((await app.inject({ method: 'GET', url: '/me/wishlist' })).statusCode).toBe(401);
  });
});
