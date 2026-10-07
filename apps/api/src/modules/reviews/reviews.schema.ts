import {
  accountPageQuerySchema,
  errorResponseSchema,
  myReviewsSchema,
  reviewInputSchema,
} from '@borneo/shared';

export const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  422: errorResponseSchema,
};

export { accountPageQuerySchema, myReviewsSchema, reviewInputSchema };
