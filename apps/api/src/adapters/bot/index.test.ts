import { describe, expect, it } from 'vitest';
import {
  BOT_TOKEN_TTL_MS,
  createDemoBotProtection,
  createUnconfiguredBotProtection,
} from './index';

describe('bot protection adapters', () => {
  it('D-232: demo tokens verify until they expire; unknown ones never', () => {
    let t = 1_000;
    const bot = createDemoBotProtection(() => t);
    const { token, expiresAt } = bot.issue();
    expect(expiresAt).toBe(1_000 + BOT_TOKEN_TTL_MS);
    expect(bot.verify(token)).toBe(true);
    expect(bot.verify('made-up')).toBe(false);
    expect(bot.verify(undefined)).toBe(false);
    t = expiresAt;
    expect(bot.verify(token)).toBe(false);
  });

  it('D-144: without a provider nothing verifies and nothing is issued', () => {
    const bot = createUnconfiguredBotProtection();
    expect(bot.available).toBe(false);
    expect(bot.verify('demo_x')).toBe(false);
    expect(() => bot.issue()).toThrow('No bot protection');
  });
});
