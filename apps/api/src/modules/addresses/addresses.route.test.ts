import { addressListSchema, addressSchema, type AddressInput } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';
import { headerSession, insertTwoCustomers } from '../../test/factories';

const db = useTestDb();
const app = testApp(db, { session: headerSession });
const as = (customer: string) => ({ 'x-test-customer': customer });

const home: AddressInput = {
  name: 'Asha Rao',
  phone: '+91 98765 43210',
  line1: '12, 4th Cross, Koramangala',
  landmark: 'Near Forum Mall',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560034',
  lat: 12.9352,
  lng: 77.6245,
};

async function add(customer: string, body: AddressInput) {
  const res = await app.inject({
    method: 'POST',
    url: '/me/addresses',
    headers: as(customer),
    payload: body,
  });
  expect(res.statusCode, res.body).toBe(201);
  return addressSchema.parse(res.json());
}

async function book(customer: string) {
  const res = await app.inject({ method: 'GET', url: '/me/addresses', headers: as(customer) });
  expect(res.statusCode).toBe(200);
  return addressListSchema.parse(res.json()).items;
}

describe('/me/addresses', () => {
  it('needs a signed-in customer', async () => {
    for (const [method, url] of [
      ['GET', '/me/addresses'],
      ['POST', '/me/addresses'],
    ] as const) {
      const res = await app.inject({
        method,
        url,
        ...(method === 'POST' ? { payload: home } : {}),
      });
      expect(res.statusCode).toBe(401);
    }
  });

  it('D-53: saves an address with its exact pin; phone stored as 10 digits', async () => {
    const { owner } = await insertTwoCustomers(db);
    const saved = await add(owner, home);
    expect(saved).toMatchObject({
      lat: 12.9352,
      lng: 77.6245,
      phone: '9876543210',
      line2: null,
      landmark: 'Near Forum Mall',
      isDefault: true,
    });
    expect(await book(owner)).toEqual([saved]);
  });

  it('D-189: a pin far from its pincode is refused with a reason', async () => {
    const { owner } = await insertTwoCustomers(db);
    const res = await app.inject({
      method: 'POST',
      url: '/me/addresses',
      headers: as(owner),
      payload: { ...home, lat: 12.3, lng: 76.65 },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('PIN_FAR_FROM_PINCODE');
  });

  it('D-188: default first; switching and deleting the default', async () => {
    const { owner } = await insertTwoCustomers(db);
    const first = await add(owner, home);
    const second = await add(owner, { ...home, line1: 'Office' });
    expect((await book(owner)).map((a) => [a.id, a.isDefault])).toEqual([
      [first.id, true],
      [second.id, false],
    ]);

    await app.inject({
      method: 'POST',
      url: `/me/addresses/${second.id}/default`,
      headers: as(owner),
    });
    expect((await book(owner))[0]).toMatchObject({ id: second.id, isDefault: true });

    const del = await app.inject({
      method: 'DELETE',
      url: `/me/addresses/${second.id}`,
      headers: as(owner),
    });
    expect(del.statusCode).toBe(204);
    expect(await book(owner)).toEqual([{ ...first, isDefault: true }]);
  });

  it('edits an address', async () => {
    const { owner } = await insertTwoCustomers(db);
    const saved = await add(owner, home);
    const res = await app.inject({
      method: 'PUT',
      url: `/me/addresses/${saved.id}`,
      headers: as(owner),
      payload: { ...home, line2: 'Flat 3B' },
    });
    expect(res.statusCode).toBe(200);
    expect(addressSchema.parse(res.json())).toEqual({ ...saved, line2: 'Flat 3B' });
  });

  it("D-96: another customer's address is not found", async () => {
    const { owner, other } = await insertTwoCustomers(db);
    const saved = await add(owner, home);
    expect(await book(other)).toEqual([]);
    for (const [method, url] of [
      ['PUT', `/me/addresses/${saved.id}`],
      ['POST', `/me/addresses/${saved.id}/default`],
      ['DELETE', `/me/addresses/${saved.id}`],
    ] as const) {
      const res = await app.inject({
        method,
        url,
        headers: as(other),
        ...(method === 'PUT' ? { payload: home } : {}),
      });
      expect(res.statusCode, `${method} ${url}`).toBe(404);
      expect(res.json().error.code).toBe('ADDRESS_NOT_FOUND');
    }
    expect(await book(owner)).toEqual([saved]);
  });
});
