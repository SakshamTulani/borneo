import { z } from 'zod';
import {
  authResponseSchema,
  errorResponseSchema,
  passwordResetInputSchema,
  passwordResetRequestResponseSchema,
  passwordResetRequestSchema,
  sessionResponseSchema,
  signInInputSchema,
  signUpInputSchema,
} from '@borneo/shared';

export {
  authResponseSchema,
  errorResponseSchema,
  passwordResetInputSchema,
  passwordResetRequestResponseSchema,
  passwordResetRequestSchema,
  sessionResponseSchema,
  signInInputSchema,
  signUpInputSchema,
};

/** 204 responses have no body. */
export const noContent = z.null();
