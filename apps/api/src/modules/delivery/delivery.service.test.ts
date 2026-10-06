import type { FlashSale } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { emptyDeliveryDeps } from '../../test/factories';
import type { DeliveryTarget } from './delivery.repository';
import { createDeliveryService } from './delivery.service';

const now = Date.parse('2026-10-06T06:30:00Z');
const target: DeliveryTarget = {
  variantId: 'v1',
  categoryId: 'phones',
  status: 'live',
  dispatchFrom: null,
  dispatchTo: null,
  preorderCap: null,
  preorderSold: 0,
};
const service = (over: Partial<DeliveryTarget> = {}, sales: FlashSale[] = []) =>
  createDeliveryService(
    emptyDeliveryDeps({
      now: () => now,
      findTarget: async () => ({ ...target, ...over }),
      loadServiceability: async (pincode) => [
        { pincode, categoryId: 'phones', deliverable: true, codAllowed: true },
      ],
      loadStock: async () => [{ warehouseId: 'w1', available: 3 }],
      listLanes: async () => [{ warehouseId: 'w1', pincodePrefix: '', minDays: 2, maxDays: 4 }],
      loadFlashSales: async () => sales,
    }),
  );

describe('delivery service', () => {
  it('D-65: a sold-out pre-order is not offered at any pincode', async () => {
    const preorder = {
      status: 'preorder' as const,
      dispatchFrom: '2026-11-01',
      dispatchTo: '2026-11-03',
      preorderCap: 10,
    };
    expect(
      (await service({ ...preorder, preorderSold: 10 }).check('S', '560001', 1)).estimate,
    ).toEqual({ status: 'outOfStockHere' });
    expect(
      (await service({ ...preorder, preorderSold: 9 }).check('S', '560001', 1)).estimate,
    ).toMatchObject({ status: 'deliverable', from: '2026-11-03', to: '2026-11-07' });
  });

  it('D-65: a pre-order asks for no more than is left under its cap', async () => {
    const preorder = {
      status: 'preorder' as const,
      dispatchFrom: '2026-11-01',
      dispatchTo: '2026-11-03',
      preorderCap: 10,
      preorderSold: 9,
    };
    expect((await service(preorder).check('S', '560001', 2)).estimate).toEqual({
      status: 'outOfStockHere',
    });
  });

  it('D-71: a sold-out or ended flash sale no longer blocks COD', async () => {
    const sale: FlashSale = {
      id: 'f',
      variantId: 'v1',
      salePricePaise: 100,
      startsAt: now - 1000,
      endsAt: now + 1000,
      cap: 5,
      sold: 5,
      perCustomerLimit: 1,
    };
    expect((await service({}, [sale]).check('S', '560001', 1)).estimate).toMatchObject({
      cod: { allowed: true, reasons: [] },
    });
    expect(
      (await service({}, [{ ...sale, sold: 0 }]).check('S', '560001', 1)).estimate,
    ).toMatchObject({ cod: { allowed: false, reasons: ['FLASH_SALE'] } });
  });

  it('D-17: only products on sale get an estimate; drafts are 404', async () => {
    await expect(service({ status: 'draft' }).check('S', '560001', 1)).rejects.toMatchObject({
      code: 'VARIANT_NOT_FOUND',
    });
  });
});
