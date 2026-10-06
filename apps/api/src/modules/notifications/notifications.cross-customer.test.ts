import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../test/db';
import { insertTwoCustomers } from '../../test/factories';
import {
  countUnread,
  insertNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications.repository';

const db = useTestDb();
const entry = { kind: 'password_reset' as const, title: 'Reset', body: 'Body' };

describe('notifications are scoped to their customer (D-96)', () => {
  it("another customer can't list, count or read the owner's inbox", async () => {
    const { owner, other } = await insertTwoCustomers(db);
    await insertNotification(owner, db, entry);
    const [mine] = await listNotifications(owner, db, { limit: 10 });

    expect(await listNotifications(other, db, { limit: 10 })).toEqual([]);
    expect(await countUnread(other, db)).toBe(0);
    expect(await markNotificationRead(other, db, mine!.id, new Date())).toBe(false);
    await markAllNotificationsRead(other, db, new Date());

    expect(await countUnread(owner, db)).toBe(1);
    expect((await listNotifications(owner, db, { limit: 10 }))[0]!.readAt).toBeNull();
  });
});
