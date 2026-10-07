import { myReviewsSchema, type MyReviews, type ReviewInput } from '@borneo/shared';
import { getJson, sendJson } from '../../../shared/lib/http';

export const getMyReviews = (): Promise<MyReviews> => getJson('/me/reviews', myReviewsSchema);

export const postReview = (input: ReviewInput): Promise<MyReviews> =>
  sendJson('POST', '/me/reviews', input, myReviewsSchema);
