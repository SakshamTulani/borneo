import type { PaymentMethod } from '@borneo/shared';

export type PaymentSessionRequest = {
  attemptId: string;
  orderNumber: string;
  amountPaise: number;
  method: Exclude<PaymentMethod, 'cod'>;
  /** The session ends with the stock hold, never later (D-58). */
  expiresAt: number;
};

/**
 * PaymentGateway port (ADR-0003, D-163). `startSession` opens a gateway session for one attempt
 * and returns the gateway's reference. Results come back through callbacks; in the demo the mock
 * gateway page sends them (D-213).
 */
export type PaymentGateway = {
  /** False when no gateway is configured: prepaid orders can't be placed (D-74). */
  available: boolean;
  startSession(request: PaymentSessionRequest): Promise<{ gatewayRef: string }>;
};

/** Demo: no money moves. The reference is derived from the attempt (D-100, D-213). */
export function createMockGateway(): PaymentGateway {
  return {
    available: true,
    async startSession(request) {
      return { gatewayRef: `mock_${request.attemptId}` };
    },
  };
}

/** Outside demo mode until a real gateway exists (production blocker D-74). */
export function createUnconfiguredGateway(): PaymentGateway {
  return {
    available: false,
    async startSession() {
      throw new Error('No payment gateway configured (D-74)');
    },
  };
}
