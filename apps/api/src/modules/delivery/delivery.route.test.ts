import { deliveryCheckSchema, pincodeAreaSchema, type DeliveryCheck } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { catalogService, deliveryService, searchService } from '../../services';
import { TEST_NOW, useTestDb } from '../../test/db';
import { createHealthService } from '../health/index';

const db = useTestDb();
const catalog = catalogService(db, () => TEST_NOW.getTime());
const app = buildApp({
  health: createHealthService({ demoMode: false, pingDatabase: async () => true }),
  catalog,
  search: searchService(db, catalog),
  delivery: deliveryService(db, () => TEST_NOW.getTime()),
});

async function check(sku: string, pincode: string, qty = 1): Promise<DeliveryCheck> {
  const res = await app.inject({
    method: 'GET',
    url: `/delivery?sku=${sku}&pincode=${pincode}&qty=${qty}`,
  });
  expect(res.statusCode, `${sku} @ ${pincode}`).toBe(200);
  return deliveryCheckSchema.parse(res.json());
}

// TEST_NOW is 6 Oct 2026, noon IST.
describe('GET /delivery', () => {
  it('D-52: a stocked phone near a warehouse arrives in a date range, with COD', async () => {
    expect(await check('BP4-6-128-FOR', '560034')).toEqual({
      pincode: '560034',
      place: { city: 'Bengaluru', state: 'Karnataka' },
      estimate: {
        status: 'deliverable',
        from: '2026-10-07',
        to: '2026-10-08',
        cod: { allowed: true, reasons: [] },
      },
    });
  });

  it('D-54: the date depends on which warehouse has stock for the pincode', async () => {
    // Vista 43 has no Bengaluru stock, so it ships from farther away.
    expect((await check('TV-V43', '560001')).estimate).toMatchObject({
      status: 'deliverable',
      from: '2026-10-11',
      to: '2026-10-14',
    });
  });

  it('D-54: more units than any one warehouse holds is out of stock here', async () => {
    expect((await check('BA2X-16-1T-TIT', '560001', 7)).estimate).toEqual({
      status: 'outOfStockHere',
    });
    expect((await check('BA2X-16-1T-TIT', '560001', 6)).estimate.status).toBe('deliverable');
  });

  it('D-51: not deliverable per pincode × category', async () => {
    expect((await check('TV-V43', '744101')).estimate).toEqual({ status: 'notDeliverable' });
    expect((await check('BP4-6-128-FOR', '744101')).estimate.status).toBe('deliverable');
  });

  it('D-62: a pincode without serviceability rows is not deliverable', async () => {
    const shimla = await check('BP4-6-128-FOR', '171001');
    expect(shimla.place).toEqual({ city: 'Shimla', state: 'Himachal Pradesh' });
    expect(shimla.estimate).toEqual({ status: 'notDeliverable' });
    expect(await check('BP4-6-128-FOR', '999999')).toEqual({
      pincode: '999999',
      place: null,
      estimate: { status: 'notDeliverable' },
    });
  });

  it('D-50: a malformed pincode is reported, not rejected', async () => {
    expect((await check('BP4-6-128-FOR', '5600')).estimate).toEqual({ status: 'invalidPincode' });
  });

  it('D-70: COD follows the pincode × category row', async () => {
    expect((await check('BP4-6-128-FOR', '744101')).estimate).toMatchObject({
      cod: { allowed: false, reasons: ['PINCODE'] },
    });
  });

  it('D-71: no COD while a flash sale is live on the variant', async () => {
    expect((await check('EB2-BLK', '560001')).estimate).toMatchObject({
      cod: { allowed: false, reasons: ['FLASH_SALE'] },
    });
    // The upcoming Pulse 4 sale does not block COD yet.
    expect((await check('BP4-8-256-GRA', '560001')).estimate).toMatchObject({
      cod: { allowed: true },
    });
  });

  it('D-64, D-146: a pre-order counts from its dispatch window and has no COD', async () => {
    // Dispatch 27 Oct – 3 Nov, then the 1–2 day Bengaluru lane.
    expect((await check('BN4-12-256-GLA', '560001')).estimate).toEqual({
      status: 'deliverable',
      from: '2026-10-28',
      to: '2026-11-05',
      cod: { allowed: false, reasons: ['PREORDER'] },
    });
  });

  it('D-17: unknown and discontinued SKUs are 404', async () => {
    for (const sku of ['NOPE', 'BP3-6-128-GRA']) {
      const res = await app.inject({ method: 'GET', url: `/delivery?sku=${sku}&pincode=560001` });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('VARIANT_NOT_FOUND');
    }
  });

  it('rejects a quantity out of range', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/delivery?sku=BP4-6-128-FOR&pincode=560001&qty=11',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION');
  });
});

describe('GET /pincodes/at', () => {
  const at = (lat: number, lng: number) =>
    app.inject({ method: 'GET', url: `/pincodes/at?lat=${lat}&lng=${lng}` });

  it('D-184: a map pin resolves to the nearest known pincode', async () => {
    const koramangala = await at(12.93, 77.625);
    expect(koramangala.statusCode).toBe(200);
    expect(pincodeAreaSchema.parse(koramangala.json())).toMatchObject({
      pincode: '560034',
      city: 'Bengaluru',
    });
    expect((await at(31.1, 77.17)).json()).toMatchObject({ pincode: '171001' });
  });

  it('D-184: a pin far from every known pincode is 404', async () => {
    const res = await at(15, 65); // Arabian Sea
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('PINCODE_NOT_FOUND');
  });

  it('rejects coordinates off the globe', async () => {
    expect((await at(100, 77)).statusCode).toBe(400);
  });
});
