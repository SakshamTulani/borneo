import { accountSummarySchema, ownedDevicesSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';
import { headerSession, insertCustomer, insertDeliveredOrder } from '../../test/factories';
import { countOrders, listDeliveredLines } from '../orders/index';
import { findMemberSince } from './account.repository';

// Places orders of products with known stock: kept out of the shared catalog other suites list.
const db = useTestDb('orders');
const app = testApp(db, { session: headerSession, demoMode: true });
const as = (c: string) => ({ 'x-test-customer': c });

describe('the account overview is scoped to its customer (D-96, D-24)', () => {
  it("repositories never count or list another customer's orders and devices", async () => {
    const { shopper } = await insertDeliveredOrder(app, db);
    const other = await insertCustomer(db);
    expect(await listDeliveredLines(other, db)).toEqual([]);
    expect((await countOrders(other, db)).size).toBe(0);
    expect(await listDeliveredLines(shopper.customerId, db)).toHaveLength(1);
    expect(await findMemberSince(crypto.randomUUID() as typeof other, db)).toBeUndefined();
  });

  it("routes show another customer nothing of the owner's", async () => {
    await insertDeliveredOrder(app, db);
    const other = await insertCustomer(db);
    const summary = accountSummarySchema.parse(
      (await app.inject({ method: 'GET', url: '/me/summary', headers: as(other) })).json(),
    );
    expect(summary).toMatchObject({
      orders: 0,
      activeOrders: 0,
      devices: 0,
      reviewPrompts: 0,
      watching: 0,
      openReturns: 0,
    });
    const devices = ownedDevicesSchema.parse(
      (await app.inject({ method: 'GET', url: '/me/devices', headers: as(other) })).json(),
    );
    expect(devices.items).toEqual([]);
  });
});
