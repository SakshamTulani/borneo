import { describe, expect, it } from 'vitest';
import { ratingCounts, reviewerName } from './reviews';

describe('reviews', () => {
  it('D-150: reviewers are shown by first name and last initial only', () => {
    expect(reviewerName('Aarav Mehta')).toBe('Aarav M.');
    expect(reviewerName('  Lakshmi   ramesh Krishnan ')).toBe('Lakshmi K.');
    expect(reviewerName('Zoya')).toBe('Zoya');
    expect(reviewerName('  ')).toBe('Verified buyer');
  });

  it('D-150: counts reviews per star rating', () => {
    expect(
      ratingCounts([
        { rating: 5, count: 3 },
        { rating: 2, count: 1 },
        { rating: 9, count: 4 },
      ]),
    ).toEqual([0, 1, 0, 0, 3]);
  });
});
