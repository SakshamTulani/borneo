import {
  accountPageQuerySchema,
  errorResponseSchema,
  wishlistPageSchema,
  wishlistParamsSchema,
  wishlistSlugsSchema,
} from '@borneo/shared';

export const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  404: errorResponseSchema,
  422: errorResponseSchema,
};

export { accountPageQuerySchema, wishlistPageSchema, wishlistParamsSchema, wishlistSlugsSchema };
