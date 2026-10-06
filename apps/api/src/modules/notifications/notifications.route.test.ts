import { notificationPageSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import type { buildApp } from '../../app';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';
import { headerSession, insertTwoCustomers } from '../../test/factories';
import { insertNotification } from './notifications.repository';

const db = useTestDb();
const app: ReturnType<typeof buildApp> = testApp(db, { session: headerSession });
const as = (customer: string) => ({ 'x-test-customer': customer });

async function inbox(customer: string, query = '') {
  const res = await app.inject({
    method: 'GET',
    url: `/me/notifications${query}`,
    headers: as(customer),
  });
  expect(res.statusCode).toBe(200);
  return notificationPageSchema.parse(res.json());
}

describe('GET /me/notifications', () => {
  it('needs a signed-in customer', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/notifications' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHENTICATED');
  });

  it('D-101: lists newest first in pages, with the unread count', async () => {
    const { owner } = await insertTwoCustomers(db);
    for (let i = 1; i <= 3; i++) {
      await insertNotification(
        owner,
        db,
        { kind: 'password_reset', title: `N${i}`, body: '' },
        new Date(Date.UTC(2026, 9, i)),
      );
    }
    const first = await inbox(owner, '?limit=2');
    expect(first.items.map((n) => n.title)).toEqual(['N3', 'N2']);
    expect(first.unread).toBe(3);
    const second = await inbox(owner, `?limit=2&cursor=${first.nextCursor}`);
    expect(second.items.map((n) => n.title)).toEqual(['N1']);
    expect(second.nextCursor).toBeNull();
  });

  it('marks one or all as read', async () => {
    const { owner } = await insertTwoCustomers(db);
    for (const title of ['A', 'B']) {
      await insertNotification(owner, db, { kind: 'password_reset', title, body: '' });
    }
    const [newest] = (await inbox(owner)).items;
    const one = await app.inject({
      method: 'POST',
      url: `/me/notifications/${newest!.id}/read`,
      headers: as(owner),
    });
    expect(one.statusCode).toBe(204);
    expect((await inbox(owner)).unread).toBe(1);

    await app.inject({ method: 'POST', url: '/me/notifications/read-all', headers: as(owner) });
    expect((await inbox(owner)).unread).toBe(0);
  });

  it("D-96: another customer's notification is not found", async () => {
    const { owner, other } = await insertTwoCustomers(db);
    await insertNotification(owner, db, { kind: 'password_reset', title: 'Mine', body: '' });
    const [mine] = (await inbox(owner)).items;
    expect((await inbox(other)).items).toEqual([]);
    const res = await app.inject({
      method: 'POST',
      url: `/me/notifications/${mine!.id}/read`,
      headers: as(other),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOTIFICATION_NOT_FOUND');
  });

  it('rejects a forged cursor', async () => {
    const { owner } = await insertTwoCustomers(db);
    const res = await app.inject({
      method: 'GET',
      url: '/me/notifications?cursor=bm90LWEtY3Vyc29y',
      headers: as(owner),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_CURSOR');
  });
});
