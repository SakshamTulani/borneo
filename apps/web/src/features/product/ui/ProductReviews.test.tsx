import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { stubApi } from '@/test/api';
import { productFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { ProductReviews } from './ProductReviews';

afterEach(() => vi.unstubAllGlobals());

const review = (id: string, rating: number, title: string) => ({
  id,
  rating,
  title,
  body: `Body of ${title}`,
  author: 'Aarav M.',
  createdAt: Date.UTC(2026, 8, 20),
});

describe('ProductReviews', () => {
  it('D-150: shows written verified reviews, the star breakdown and loads more; axe clean', async () => {
    const api = stubApi({
      'GET /products/pulse-4/reviews': [
        200,
        { items: [review('r3', 2, 'Older one')], nextCursor: null },
      ],
    });
    const product = productFixture({
      rating: { average: 4.5, count: 3 },
      reviews: {
        counts: [0, 1, 0, 0, 2],
        page: {
          items: [review('r1', 5, 'Smooth everyday phone'), review('r2', 4, 'Solid build')],
          nextCursor: 'c1',
        },
      },
    });
    const { container } = await renderWithRouter(<ProductReviews product={product} />);
    expect(screen.getByRole('heading', { name: 'Smooth everyday phone' })).toBeTruthy();
    expect(screen.getByText('Body of Solid build')).toBeTruthy();
    expect(screen.getAllByText('Verified purchase')).toHaveLength(2);
    expect(screen.getAllByText('Aarav M.')).toHaveLength(2);
    const breakdown = screen.getByRole('list', { name: 'Reviews by rating' });
    expect(within(breakdown).getAllByRole('listitem')[0]!.textContent).toContain(
      '5 star reviews: 2',
    );
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Show more reviews' }));
    expect(await screen.findByRole('heading', { name: 'Older one' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show more reviews' })).toBeNull();
    expect(new URL(String(api.mock.calls[0]![0]), 'http://x').searchParams.get('cursor')).toBe(
      'c1',
    );
  });

  it('D-150: no reviews yet says so, with no score', async () => {
    await renderWithRouter(<ProductReviews product={productFixture()} />);
    expect(screen.getByText(/^No reviews yet\. Only customers who bought/)).toBeTruthy();
    expect(screen.queryByRole('img', { name: /Rated/ })).toBeNull();
  });
});
