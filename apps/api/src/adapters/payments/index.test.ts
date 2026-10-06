import { describe, expect, it } from 'vitest';
import { createMockGateway, createUnconfiguredGateway } from './index';

const request = {
  attemptId: 'a1',
  orderNumber: 'BN-000001',
  amountPaise: 100,
  method: 'upi' as const,
  expiresAt: 1,
};

describe('payment gateway adapters', () => {
  it('D-74: the mock gateway opens a session without moving money', async () => {
    const gateway = createMockGateway();
    expect(gateway.available).toBe(true);
    expect(await gateway.startSession(request)).toEqual({ gatewayRef: 'mock_a1' });
  });

  it('D-74: without a real gateway nothing can be charged', async () => {
    const gateway = createUnconfiguredGateway();
    expect(gateway.available).toBe(false);
    await expect(gateway.startSession(request)).rejects.toThrow('No payment gateway');
  });
});
