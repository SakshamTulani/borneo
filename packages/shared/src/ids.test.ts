import { describe, expect, it } from 'vitest';
import { toCustomerId } from './ids';

describe('toCustomerId', () => {
  it('rejects empty ids', () => {
    expect(() => toCustomerId('')).toThrow('CustomerId cannot be empty');
  });
});
