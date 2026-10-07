import { returnPageSchema, returnRequestViewSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import { headerSession, insertCustomer, insertDeliveredOrder } from '../../test/factories';
import {
  advanceReturn,
  countOpenReturns,
  findReturn,
  findReturnPhoto,
  findReturnTarget,
  listReturns,
} from './returns.repository';

// Places orders of products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const app = testApp(db, { session: headerSession, demoMode: true });
const as = (c: string) => ({ 'x-test-customer': c });
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

/** A delivered order with a damage return (one photo) for its owner, and another customer. */
async function ownerReturn() {
  const { shopper, order } = await insertDeliveredOrder(app, db);
  const item = order.items[0]!;
  const res = await app.inject({
    method: 'POST',
    url: `/me/orders/${order.id}/items/${item.id}/returns`,
    headers: as(shopper.customerId),
    payload: { kind: 'return', reason: 'damage', photos: [PNG.toString('base64')] },
  });
  const request = returnRequestViewSchema.parse(res.json());
  const [photo] = (await findReturn(shopper.customerId, db, request.id))!.request.photoKeys;
  return {
    owner: shopper.customerId,
    other: await insertCustomer(db),
    order,
    item,
    request,
    photoId: photo!,
  };
}

describe('returns are scoped to their customer (D-96, D-218)', () => {
  it("repositories never return or change another customer's request", async () => {
    const { owner, other, order, item, request, photoId } = await ownerReturn();
    expect(await findReturnTarget(other, db, order.id, item.id)).toBeUndefined();
    expect(await findReturn(other, db, request.id)).toBeUndefined();
    expect(await listReturns(other, db)).toEqual([]);
    expect(await findReturnPhoto(other, db, request.id, photoId)).toBeUndefined();
    expect(await countOpenReturns(other, db)).toBe(0);
    const at = new Date(TEST_NOW.getTime() + 1_000);
    expect(
      await advanceReturn(other, db, {
        id: request.id,
        from: 'requested',
        to: 'approved',
        refundPaise: 0,
        at,
      }),
    ).toBe(false);
    expect((await findReturn(owner, db, request.id))!.request.status).toBe('requested');
    expect(await findReturnPhoto(owner, db, request.id, photoId)).toBeDefined();
  });

  it("routes answer 404 or nothing for another customer's request, photo and line", async () => {
    const { other, order, item, request, photoId } = await ownerReturn();
    const filed = await app.inject({
      method: 'POST',
      url: `/me/orders/${order.id}/items/${item.id}/returns`,
      headers: as(other),
      payload: { kind: 'return', reason: 'changedMind' },
    });
    expect(filed.statusCode).toBe(404);
    const photo = await app.inject({
      method: 'GET',
      url: `/me/returns/${request.id}/photos/${photoId}`,
      headers: as(other),
    });
    expect(photo.statusCode).toBe(404);
    const advance = await app.inject({
      method: 'POST',
      url: `/me/returns/${request.id}/demo/advance`,
      headers: as(other),
    });
    expect(advance.statusCode).toBe(404);
    const list = await app.inject({ method: 'GET', url: '/me/returns', headers: as(other) });
    expect(returnPageSchema.parse(list.json()).items).toEqual([]);
  });
});
