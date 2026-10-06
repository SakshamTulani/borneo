import { reviewPageSchema, type ReviewPage } from '@borneo/shared';
import { getJson } from '../../../shared/lib/http';

/** The next page of verified reviews after `cursor`, newest first. */
export const getReviews = (slug: string, cursor: string): Promise<ReviewPage> =>
  getJson(
    `/products/${encodeURIComponent(slug)}/reviews?cursor=${encodeURIComponent(cursor)}`,
    reviewPageSchema,
  );
