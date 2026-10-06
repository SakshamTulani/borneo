import { randomUUID } from 'node:crypto';
import { toCustomerId, type CustomerId } from '@borneo/shared';

// Test data factories. Grows per phase (products, orders, ...).

export function makeCustomerId(): CustomerId {
  return toCustomerId(randomUUID());
}

/** Two distinct customers for cross-customer tests (ADR-0005). */
export function makeTwoCustomers(): { owner: CustomerId; other: CustomerId } {
  return { owner: makeCustomerId(), other: makeCustomerId() };
}
