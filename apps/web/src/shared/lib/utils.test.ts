import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('treats the custom type scale as font sizes, not colours', () => {
    expect(cn('text-sm text-ink-muted', 'text-tagline text-ink')).toBe('text-tagline text-ink');
    expect(cn('text-ink', 'text-title')).toBe('text-ink text-title');
  });
});
