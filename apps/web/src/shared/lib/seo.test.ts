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

  it('sets one canonical URL and matching Open Graph tags', () => {
    const head = pageHead({
      title: 'Borneo Pulse 4',
      description: 'A phone.',
      path: '/products/pulse-4',
      type: 'product',
    });
    expect(head.links).toEqual([
      { rel: 'canonical', href: 'http://localhost:5173/products/pulse-4' },
    ]);
    expect(head.meta).toEqual(
      expect.arrayContaining([
        { title: 'Borneo Pulse 4 · Borneo' },
        { name: 'description', content: 'A phone.' },
        { property: 'og:title', content: 'Borneo Pulse 4 · Borneo' },
        { property: 'og:type', content: 'product' },
        { property: 'og:url', content: 'http://localhost:5173/products/pulse-4' },
      ]),
    );
  });

  it('omits canonical when no path is given', () => {
    expect(pageHead({ title: 'Borneo' }).links).toEqual([]);
  });
});
