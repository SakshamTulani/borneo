import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { MyReviews } from '@borneo/shared';
import { customer, sentTo, stubApi } from '@/test/api';
import { renderWithRouter } from '@/test/router';
import { ReviewsPage } from './ReviewsPage';

afterEach(() => vi.unstubAllGlobals());

const T = Date.UTC(2026, 9, 3);
const prompt = {
  orderItemId: 'i1',
  productId: 'p1',
  productName: 'Echo Buds 2',
  slug: 'echo-buds-2',
  image: null,
  deliveredAt: T,
};
const written = {
  id: 'rv1',
  productName: 'Pulse 4',
  slug: 'pulse-4',
  rating: 5,
  title: 'Lovely',
  body: 'Fast and light.',
  authorName: 'Asha R.',
  createdAt: T,
};
const client = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['session'], customer);
  return qc;
};

describe('ReviewsPage', () => {
  it('D-151: prompts each delivered product; written reviews show the shown name; axe clean', async () => {
    stubApi({ 'GET /me/reviews': [200, { prompts: [prompt], reviews: [written] }] });
    const { container } = await renderWithRouter(<ReviewsPage />, { queryClient: client() });
    expect(await screen.findByText('Waiting for your review (1)')).toBeTruthy();
    expect(screen.getByText(/Shown as Asha R\./)).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-221: a rating is required (none chosen for you); the review posts with optional words', async () => {
    const after: MyReviews = { prompts: [], reviews: [{ ...written, productName: 'Echo Buds 2' }] };
    const api = stubApi({
      'GET /me/reviews': [200, { prompts: [prompt], reviews: [] }],
      'POST /me/reviews': [201, after],
      'GET /me/summary': [200, {}],
    });
    await renderWithRouter(<ReviewsPage />, { queryClient: client() });
    const stars = await screen.findAllByRole('radio');
    expect(stars.every((s) => !(s as HTMLInputElement).checked)).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Post review' }));
    expect(screen.getByText('Choose a rating')).toBeTruthy();
    await userEvent.click(screen.getByLabelText('4 stars: Very good'));
    await userEvent.type(screen.getByLabelText(/Title/), ' Good buds ');
    await userEvent.click(screen.getByRole('button', { name: 'Post review' }));
    await waitFor(() =>
      expect(sentTo(api, 'POST /me/reviews')).toEqual([
        { orderItemId: 'i1', rating: 4, title: 'Good buds' },
      ]),
    );
    expect(await screen.findByText('Your reviews')).toBeTruthy();
  });

  it('says so when there is nothing to review', async () => {
    stubApi({ 'GET /me/reviews': [200, { prompts: [], reviews: [] }] });
    await renderWithRouter(<ReviewsPage />, { queryClient: client() });
    expect(await screen.findByText('Nothing to review yet')).toBeTruthy();
  });
});
