import { eq } from 'drizzle-orm';
import {
  orderViewSchema,
  returnPageSchema,
  returnRequestViewSchema,
  type CustomerId,
} from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { notification, returnPhoto } from '../../db/schema/index';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import {
  headerSession,
  insertBuyer,
  insertDeliveredOrder,
  insertSellable,
  placeViaApi,
} from '../../test/factories';

// Places orders of products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const app = testApp(db, { session: headerSession, demoMode: true });
const live = testApp(db, { session: headerSession, demoMode: false });
const as = (customerId: CustomerId) => ({ 'x-test-customer': customerId });
const DAY = 86_400_000;

/** Smallest byte strings the content check accepts as each type (D-217). */
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const TEXT = Buffer.from('this is not an image');

type Payload = { kind: string; reason: string; details?: string; photos?: string[] };
const ask = (customerId: CustomerId, orderId: string, itemId: string, payload: Payload, on = app) =>
  on.inject({
    method: 'POST',
    url: `/me/orders/${orderId}/items/${itemId}/returns`,
    headers: as(customerId),
    payload,
  });
const advance = (customerId: CustomerId, id: string, on = app) =>
  on.inject({ method: 'POST', url: `/me/returns/${id}/demo/advance`, headers: as(customerId) });

async function delivered(method: 'cod' | 'upi' = 'cod') {
  const { shopper, order } = await insertDeliveredOrder(app, db, { method });
  return { customerId: shopper.customerId, order, item: order.items[0]! };
}

describe('asking for a return or replacement', () => {
  it('needs a session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/me/orders/${crypto.randomUUID()}/items/${crypto.randomUUID()}/returns`,
      payload: { kind: 'return', reason: 'changedMind' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('D-86: a change-of-mind return needs no photos and is recorded as requested (D-88)', async () => {
    const { customerId, order, item } = await delivered();
    const res = await ask(customerId, order.id, item.id, {
      kind: 'return',
      reason: 'changedMind',
      details: '  Not for me  ',
    });
    expect(res.statusCode).toBe(201);
    const view = returnRequestViewSchema.parse(res.json());
    expect(view).toMatchObject({
      orderId: order.id,
      orderNumber: order.number,
      orderItemId: item.id,
      kind: 'return',
      reason: 'changedMind',
      details: 'Not for me',
      photoCount: 0,
      status: 'requested',
      refundPaise: null,
      demoNextStatus: 'approved',
    });
    const kinds = (
      await db.select().from(notification).where(eq(notification.customerId, customerId))
    ).map((n) => n.kind);
    expect(kinds).toContain('return_requested');
    // The order page shows the request and offers nothing more for the line.
    const after = orderViewSchema.parse(
      (
        await app.inject({ method: 'GET', url: `/me/orders/${order.id}`, headers: as(customerId) })
      ).json(),
    );
    expect(after.items[0]!.returnRequest).toMatchObject({ id: view.id, status: 'requested' });
    expect(after.items[0]!.returnOptions).toEqual([]);
  });

  it('D-217: returns open only once the order is delivered (422 NOT_DELIVERED)', async () => {
    const item = await insertSellable(db);
    const shopper = await insertBuyer(db, item.key);
    const order = await placeViaApi(app, shopper, 'cod');
    const res = await ask(shopper.customerId, order.id, order.items[0]!.id, {
      kind: 'return',
      reason: 'changedMind',
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('NOT_DELIVERED');
  });

  it('D-87: after the 7-day window it is 422 WINDOW_CLOSED', async () => {
    const { customerId, order, item } = await delivered();
    const late = testApp(db, {
      session: headerSession,
      demoMode: true,
      now: () => TEST_NOW.getTime() + 8 * DAY,
    });
    const res = await ask(
      customerId,
      order.id,
      item.id,
      { kind: 'return', reason: 'changedMind' },
      late,
    );
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('WINDOW_CLOSED');
    const view = orderViewSchema.parse(
      (
        await late.inject({ method: 'GET', url: `/me/orders/${order.id}`, headers: as(customerId) })
      ).json(),
    );
    expect(view.items[0]!.returnOptions).toEqual([]);
  });

  it('D-81: a replacement is for a defect or damage only', async () => {
    const { customerId, order, item } = await delivered();
    const res = await ask(customerId, order.id, item.id, {
      kind: 'replacement',
      reason: 'changedMind',
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('REPLACEMENT_NEEDS_DEFECT');
  });

  it('D-88: a defect without photos is 422 PHOTOS_REQUIRED', async () => {
    const { customerId, order, item } = await delivered();
    const res = await ask(customerId, order.id, item.id, { kind: 'replacement', reason: 'defect' });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('PHOTOS_REQUIRED');
  });

  it('D-217: photos are checked by content; a non-image is 422 PHOTO_NOT_IMAGE', async () => {
    const { customerId, order, item } = await delivered();
    const res = await ask(customerId, order.id, item.id, {
      kind: 'return',
      reason: 'damage',
      photos: [JPEG.toString('base64'), TEXT.toString('base64')],
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('PHOTO_NOT_IMAGE');
  });

  it('D-217: more than 3 photos is refused', async () => {
    const { customerId, order, item } = await delivered();
    const res = await ask(customerId, order.id, item.id, {
      kind: 'return',
      reason: 'damage',
      photos: Array.from({ length: 4 }, () => JPEG.toString('base64')),
    });
    expect(res.statusCode).toBe(400);
  });

  it('D-218: JPEG and PNG photos are stored and read back with their type by the sender only', async () => {
    const { customerId, order, item } = await delivered();
    const res = await ask(customerId, order.id, item.id, {
      kind: 'replacement',
      reason: 'defect',
      photos: [`data:image/jpeg;base64,${JPEG.toString('base64')}`, PNG.toString('base64')],
    });
    expect(res.statusCode).toBe(201);
    const view = returnRequestViewSchema.parse(res.json());
    expect(view).toMatchObject({ kind: 'replacement', photoCount: 2 });
    const photos = await db
      .select()
      .from(returnPhoto)
      .where(eq(returnPhoto.returnRequestId, view.id));
    expect(photos.map((p) => p.contentType).sort()).toEqual(['image/jpeg', 'image/png']);
    for (const p of photos) {
      const got = await app.inject({
        method: 'GET',
        url: `/me/returns/${view.id}/photos/${p.id}`,
        headers: as(customerId),
      });
      expect(got.statusCode).toBe(200);
      expect(got.headers['content-type']).toBe(p.contentType);
      expect(got.headers['x-content-type-options']).toBe('nosniff');
      expect(got.rawPayload.equals(p.contentType === 'image/png' ? PNG : JPEG)).toBe(true);
    }
    const missing = await app.inject({
      method: 'GET',
      url: `/me/returns/${view.id}/photos/${crypto.randomUUID()}`,
      headers: as(customerId),
    });
    expect(missing.statusCode).toBe(404);
  });

  it('D-217: one open request per line; a second is 409', async () => {
    const { customerId, order, item } = await delivered();
    const first = await ask(customerId, order.id, item.id, {
      kind: 'return',
      reason: 'changedMind',
    });
    expect(first.statusCode).toBe(201);
    const second = await ask(customerId, order.id, item.id, { kind: 'return', reason: 'other' });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('RETURN_ALREADY_REQUESTED');
  });

  it('D-217: parallel requests for one line make exactly one', async () => {
    const { customerId, order, item } = await delivered();
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        ask(customerId, order.id, item.id, { kind: 'return', reason: 'changedMind' }),
      ),
    );
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409, 409, 409]);
  });

  it('an unknown line is 404', async () => {
    const { customerId, order } = await delivered();
    const res = await ask(customerId, order.id, crypto.randomUUID(), {
      kind: 'return',
      reason: 'changedMind',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('ORDER_ITEM_NOT_FOUND');
  });
});

describe('the demo support desk', () => {
  it('D-219: a prepaid return goes requested → approved → completed and refunds what the line cost', async () => {
    const { customerId, order, item } = await delivered('upi');
    const created = returnRequestViewSchema.parse(
      (await ask(customerId, order.id, item.id, { kind: 'return', reason: 'changedMind' })).json(),
    );
    const approved = returnRequestViewSchema.parse((await advance(customerId, created.id)).json());
    expect(approved).toMatchObject({
      status: 'approved',
      refundPaise: null,
      demoNextStatus: 'completed',
    });
    const done = returnRequestViewSchema.parse((await advance(customerId, created.id)).json());
    const linePaid = item.unitPricePaise * item.qty - item.discountPaise;
    expect(done).toMatchObject({
      status: 'completed',
      refundPaise: linePaid,
      demoNextStatus: null,
    });
    const again = await advance(customerId, created.id);
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('NOTHING_TO_ADVANCE');

    const view = orderViewSchema.parse(
      (
        await app.inject({ method: 'GET', url: `/me/orders/${order.id}`, headers: as(customerId) })
      ).json(),
    );
    expect(view.refunds.map((r) => r.amountPaise)).toEqual([linePaid]);
    expect(view.items[0]!.returnRequest).toMatchObject({
      status: 'completed',
      refundPaise: linePaid,
    });
    const kinds = (
      await db.select().from(notification).where(eq(notification.customerId, customerId))
    ).map((n) => n.kind);
    expect(kinds.filter((k) => k === 'return_updated')).toHaveLength(2);
  });

  it('D-219: a cash-on-delivery return completes without a refund', async () => {
    const { customerId, order, item } = await delivered('cod');
    const created = returnRequestViewSchema.parse(
      (await ask(customerId, order.id, item.id, { kind: 'return', reason: 'changedMind' })).json(),
    );
    await advance(customerId, created.id);
    const done = returnRequestViewSchema.parse((await advance(customerId, created.id)).json());
    expect(done).toMatchObject({ status: 'completed', refundPaise: null });
  });

  it('D-219: a completed replacement on a prepaid order refunds nothing', async () => {
    const { customerId, order, item } = await delivered('upi');
    const created = returnRequestViewSchema.parse(
      (
        await ask(customerId, order.id, item.id, {
          kind: 'replacement',
          reason: 'damage',
          photos: [PNG.toString('base64')],
        })
      ).json(),
    );
    await advance(customerId, created.id);
    const done = returnRequestViewSchema.parse((await advance(customerId, created.id)).json());
    expect(done).toMatchObject({ status: 'completed', refundPaise: null });
  });

  it('D-219: outside demo mode there is no support desk and no next status shown', async () => {
    const { customerId, order, item } = await delivered();
    const created = returnRequestViewSchema.parse(
      (
        await ask(customerId, order.id, item.id, { kind: 'return', reason: 'changedMind' }, live)
      ).json(),
    );
    expect(created.demoNextStatus).toBeNull();
    expect((await advance(customerId, created.id, live)).statusCode).toBe(404);
    const view = orderViewSchema.parse(
      (
        await live.inject({ method: 'GET', url: `/me/orders/${order.id}`, headers: as(customerId) })
      ).json(),
    );
    expect(view.items[0]!.returnRequest?.demoNextStatus).toBeNull();
  });
});

describe('the returns list', () => {
  it('lists the customer’s requests newest first', async () => {
    const { customerId, order, item } = await delivered();
    const created = returnRequestViewSchema.parse(
      (await ask(customerId, order.id, item.id, { kind: 'return', reason: 'changedMind' })).json(),
    );
    const res = await app.inject({ method: 'GET', url: '/me/returns', headers: as(customerId) });
    expect(res.statusCode).toBe(200);
    expect(returnPageSchema.parse(res.json()).items).toEqual([created]);
  });

  it('needs a session', async () => {
    expect((await app.inject({ method: 'GET', url: '/me/returns' })).statusCode).toBe(401);
  });
});
