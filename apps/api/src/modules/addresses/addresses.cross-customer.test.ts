import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../test/db';
import { insertTwoCustomers } from '../../test/factories';
import {
  deleteAddress,
  findAddress,
  insertAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from './addresses.repository';

const db = useTestDb();
const values = {
  name: 'Asha Rao',
  phone: '9876543210',
  line1: '12, 4th Cross',
  line2: null,
  landmark: null,
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560034',
  lat: 12.9352,
  lng: 77.6245,
};

describe('addresses are scoped to their customer (D-96)', () => {
  it("another customer can't see, change, default or delete the owner's address", async () => {
    const { owner, other } = await insertTwoCustomers(db);
    const mine = await insertAddress(owner, db, values, () => true);
    const theirs = await insertAddress(other, db, { ...values, name: 'Other' }, () => true);

    expect((await listAddresses(other, db)).map((a) => a.id)).toEqual([theirs.id]);
    expect(await findAddress(other, db, mine.id)).toBeUndefined();
    expect(
      await updateAddress(other, db, mine.id, { ...values, line1: 'Hijacked' }),
    ).toBeUndefined();
    expect(await setDefaultAddress(other, db, mine.id)).toBe(false);
    expect(await deleteAddress(other, db, mine.id, () => null)).toBe(false);

    // Other's own default is untouched by owner's rows, and owner's row is unchanged.
    expect((await findAddress(other, db, theirs.id))!.isDefault).toBe(true);
    expect(await findAddress(owner, db, mine.id)).toMatchObject({
      line1: '12, 4th Cross',
      isDefault: true,
    });
  });

  it('D-188: one default per customer, enforced by the database', async () => {
    const { owner } = await insertTwoCustomers(db);
    const a = await insertAddress(owner, db, values, () => true);
    const b = await insertAddress(owner, db, values, () => true);
    expect((await findAddress(owner, db, a.id))!.isDefault).toBe(false);
    expect(await setDefaultAddress(owner, db, a.id)).toBe(true);
    const book = await listAddresses(owner, db);
    expect(book.filter((x) => x.isDefault).map((x) => x.id)).toEqual([a.id]);
    expect(book.map((x) => x.id)).toEqual([a.id, b.id]);
  });

  it('D-188: parallel first saves leave exactly one default; deleting it promotes atomically', async () => {
    const { owner } = await insertTwoCustomers(db);
    const first = (existing: number) => existing === 0;
    const saved = await Promise.all([1, 2, 3].map(() => insertAddress(owner, db, values, first)));
    expect(saved.filter((a) => a.isDefault)).toHaveLength(1);
    const def = saved.find((a) => a.isDefault)!;
    const rest = saved.filter((a) => a !== def).map((a) => a.id);
    expect(await deleteAddress(owner, db, def.id, (remaining) => remaining[0]!.id)).toBe(true);
    const book = await listAddresses(owner, db);
    expect(book.filter((a) => a.isDefault)).toHaveLength(1);
    expect(rest).toContain(book[0]!.id);
  });
});
