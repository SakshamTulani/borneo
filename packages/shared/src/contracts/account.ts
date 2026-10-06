import { z } from 'zod';
import {
  normalizeIndianMobile,
  PASSWORD_MAX,
  PASSWORD_MIN,
  RESET_CODE_LENGTH,
} from '../rules/account';
import { idSchema } from './common';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Enter a valid email address'));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`);

/** Accepts common ways of typing a mobile number; always yields 10 digits (D-99). */
export const mobileSchema = z.string().transform((v, ctx) => {
  const phone = normalizeIndianMobile(v);
  if (phone === null) {
    ctx.addIssue({ code: 'custom', message: 'Enter a 10-digit mobile number' });
    return z.NEVER;
  }
  return phone;
});

export const personNameSchema = z.string().trim().min(1, 'Enter your name').max(80);

export const signUpInputSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  phone: mobileSchema,
  password: passwordSchema,
});
export type SignUpInput = z.input<typeof signUpInputSchema>;

/** Sign-in doesn't apply the password length rule: a wrong password is just wrong. */
export const signInInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX),
});
export type SignInInput = z.input<typeof signInInputSchema>;

export const passwordResetRequestSchema = z.object({ email: emailSchema });
export type PasswordResetRequest = z.input<typeof passwordResetRequestSchema>;

export const passwordResetInputSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(
      new RegExp(`^[0-9]{${RESET_CODE_LENGTH}}$`),
      `Enter the ${RESET_CODE_LENGTH}-digit code`,
    ),
  password: passwordSchema,
});
export type PasswordResetInput = z.input<typeof passwordResetInputSchema>;

export const customerSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  /** Always false in demo (D-93). */
  emailVerified: z.boolean(),
});
export type Customer = z.infer<typeof customerSchema>;

/** `GET /session`: who is signed in, if anyone. */
export const sessionResponseSchema = z.object({ customer: customerSchema.nullable() });
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/**
 * What would have been emailed, shown on screen in demo mode only (D-95, D-101).
 * Never present when DEMO_MODE is off.
 */
export const demoMessageSchema = z.object({
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  code: z.string().optional(),
});
export type DemoMessage = z.infer<typeof demoMessageSchema>;

export const authResponseSchema = z.object({ customer: customerSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;

/** Always the same answer whether or not the email has an account; `demo` only in demo mode. */
export const passwordResetRequestResponseSchema = z.object({ demo: demoMessageSchema.optional() });
export type PasswordResetRequestResponse = z.infer<typeof passwordResetRequestResponseSchema>;
