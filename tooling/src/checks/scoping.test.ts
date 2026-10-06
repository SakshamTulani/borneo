import { describe, expect, it } from 'vitest';
import { checkScoping } from './scoping.ts';

const repo = 'apps/api/src/modules/orders/orders.repository.ts';
const test = 'apps/api/src/modules/orders/orders.cross-customer.test.ts';

describe('checkScoping', () => {
  it('ignores repositories without customer data', () => {
    expect(
      checkScoping(
        new Map([
          ['apps/api/src/modules/catalog/catalog.repository.ts', 'export function list(db: Db) {}'],
        ]),
      ),
    ).toEqual([]);
  });

  it('accepts customerId-first functions with a cross-customer test', () => {
    const src =
      'export async function listOrders(customerId: CustomerId, db: Db) {}\nexport const getOrder = async (customerId: CustomerId, id: string) => 1;';
    expect(
      checkScoping(
        new Map([
          [repo, src],
          [test, ''],
        ]),
      ),
    ).toEqual([]);
  });

  it('flags functions without customerId first and a missing cross-customer test', () => {
    const src =
      'export async function listOrders(db: Db, customerId: CustomerId) {}\nexport const getOrder = (id: string) => 1;';
    expect(checkScoping(new Map([[repo, src]]))).toEqual([
      `${repo}: listOrders must take "customerId: CustomerId" as its first param`,
      `${repo}: getOrder must take "customerId: CustomerId" as its first param`,
      'apps/api/src/modules/orders/: customer-scoped module needs a *.cross-customer.test.ts',
    ]);
  });
});
