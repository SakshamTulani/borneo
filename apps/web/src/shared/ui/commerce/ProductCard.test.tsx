import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductCardSkeleton';

const base = {
  name: 'Demo Pulse 5 Pro',
  href: '/p/demo-pulse-5-pro',
  rating: { value: 4.4, count: 52 },
  price: { sellingPaise: 3_499_900 },
};

describe('ProductCard', () => {
  it('in stock: links to the product with badges', async () => {
    const { container } = render(
      <ProductCard {...base} availability="inStock" badges={[{ kind: 'inStock' }]} />,
    );
    expect(screen.getByRole('link', { name: 'Demo Pulse 5 Pro' }).getAttribute('href')).toBe(
      '/p/demo-pulse-5-pro',
    );
    expect(screen.getByText('In stock')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('out of stock: price unavailable and Watch toggles', async () => {
    const onWatchToggle = vi.fn();
    const { container } = render(
      <ProductCard {...base} availability="outOfStock" onWatchToggle={onWatchToggle} />,
    );
    expect(screen.getByText('Currently unavailable')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Watch' }));
    expect(onWatchToggle).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('watching state is pressed', () => {
    render(<ProductCard {...base} availability="outOfStock" watching onWatchToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Watching' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('skeleton is busy with a text alternative', async () => {
    const { container } = render(<ProductCardSkeleton />);
    expect(screen.getByText('Loading product')).toBeTruthy();
    expect(container.firstElementChild?.getAttribute('aria-busy')).toBe('true');
    expect(await axe(container)).toHaveNoViolations();
  });
});
