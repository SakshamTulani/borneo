import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { productFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { NewerModelNudge } from './NewerModelNudge';
import { ProductCompare } from './ProductCompare';

describe('newer model nudge', () => {
  it('D-237: names the newer model with its price and pre-order, linking to it; axe clean', async () => {
    const { container } = await renderWithRouter(
      <NewerModelNudge
        newer={{
          slug: 'nova-4',
          name: 'Borneo Nova 4',
          kind: 'newerGeneration',
          preorder: true,
          pricePaise: 3_499_900,
        }}
      />,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/products/nova-4');
    expect(link.textContent).toContain('Newer model available');
    expect(link.textContent).toContain('Borneo Nova 4 · ₹34,999 · pre-order');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-237: a higher tier reads as a step up', async () => {
    await renderWithRouter(
      <NewerModelNudge
        newer={{
          slug: 'p4pro',
          name: 'Pulse 4 Pro',
          kind: 'higherTier',
          preorder: false,
          pricePaise: 100,
        }}
      />,
    );
    expect(screen.getByRole('link').textContent).toContain('Step up to the Pulse 4 Pro');
  });
});

describe('compare from the product page', () => {
  it('D-238: one tap per related model, plus others in the category; axe clean', async () => {
    const product = productFixture({
      slug: 'pulse-4',
      name: 'Pulse 4',
      category: { slug: 'smartphones', name: 'Smartphones' },
      compareWith: [
        { slug: 'pulse-3', name: 'Pulse 3', relation: 'previous', discontinued: true },
        { slug: 'pulse-4-pro', name: 'Pulse 4 Pro', relation: 'sibling', discontinued: false },
      ],
    });
    const { container } = await renderWithRouter(<ProductCompare product={product} />);
    const prev = screen.getByRole('link', { name: /Pulse 4 vs Pulse 3/ });
    expect(prev.getAttribute('href')).toBe('/compare/smartphones?p=pulse-4%2Cpulse-3');
    expect(prev.textContent).toContain('Previous model · no longer sold');
    expect(
      screen.getByRole('link', { name: 'Compare with other smartphones' }).getAttribute('href'),
    ).toBe('/categories/smartphones?compare=pulse-4');
    expect(await axe(container)).toHaveNoViolations();
  });
});
