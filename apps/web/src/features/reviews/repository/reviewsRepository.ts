import { queryOptions } from '@tanstack/react-query';
import { getMyReviews, postReview } from '../api/reviewsApi';

/** Prompts and the customer's reviews (D-151, D-221). Under `['me']`. */
export const myReviewsQuery = queryOptions({ queryKey: ['me', 'reviews'], queryFn: getMyReviews });

export const writeReview = postReview;
