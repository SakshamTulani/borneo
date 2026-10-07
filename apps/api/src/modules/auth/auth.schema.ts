import { z } from 'zod';
import {
  authResponseSchema,
  errorResponseSchema,
  passwordChangeInputSchema,
  passwordResetInputSchema,
  passwordResetRequestResponseSchema,
  profileInputSchema,
  passwordResetRequestSchema,
  sessionResponseSchema,
  signInInputSchema,
  signUpInputSchema,
} from '@borneo/shared';

export {
  authResponseSchema,
  errorResponseSchema,
  passwordChangeInputSchema,
  profileInputSchema,
  passwordResetInputSchema,
  passwordResetRequestResponseSchema,
  passwordResetRequestSchema,
  sessionResponseSchema,
  signInInputSchema,
  signUpInputSchema,
};

/** 204 responses have no body. */
export const noContent = z.null();
