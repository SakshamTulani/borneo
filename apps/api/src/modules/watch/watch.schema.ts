import { errorResponseSchema, watchListSchema, watchParamsSchema } from '@borneo/shared';

export const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  404: errorResponseSchema,
  422: errorResponseSchema,
};

export { watchListSchema, watchParamsSchema };
