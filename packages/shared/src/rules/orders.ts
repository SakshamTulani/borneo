import type { OrderStatus } from '../contracts/orders';

const BEFORE_DISPATCH: ReadonlySet<OrderStatus> = new Set([
  'pending_payment',
  'paid',
  'confirmed',
  'packed',
]);

/** Customers cancel in their account until the order ships (D-146, D-149). */
export function canCustomerCancel(status: OrderStatus): boolean {
  return BEFORE_DISPATCH.has(status);
}
