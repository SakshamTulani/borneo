import { describe, expect, it } from 'vitest';
import { pageHead } from './seo';

describe('pageHead', () => {
  it('adds robots noindex only when asked', () => {
    expect(pageHead({ title: 'Design system', noindex: true }).meta).toContainEqual({
      name: 'robots',
      content: 'noindex, nofollow',
    });
    expect(pageHead({ title: 'Phones' }).meta).not.toContainEqual(
      expect.objectContaining({ name: 'robots' }),
    );
  });
});
