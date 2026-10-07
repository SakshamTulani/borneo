/**
 * CourierTracking port (ADR-0003, D-166). `book` hands an order to the courier and returns its
 * name and tracking number. Tracking steps come back from the courier; in the demo the order
 * page's "Advance (demo)" control stands in for them (D-215).
 */
export type CourierTracking = {
  /** False when no courier is connected: orders don't move past confirmed on their own. */
  available: boolean;
  book(order: { orderId: string; orderNumber: string }): { name: string; trackingNo: string };
};

/** Demo: nothing is booked; the tracking number is derived from the order (D-100). */
export function createDemoCourier(): CourierTracking {
  return {
    available: true,
    book: ({ orderNumber }) => ({
      name: 'Borneo Express (demo)',
      trackingNo: `BX${orderNumber.replace(/\D/g, '').padStart(8, '0')}IN`,
    }),
  };
}

/** Outside demo mode until a courier integration exists (production blocker, D-215). */
export function createUnconfiguredCourier(): CourierTracking {
  return {
    available: false,
    book() {
      throw new Error('No courier configured (D-215)');
    },
  };
}
