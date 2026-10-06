import { queryOptions } from '@tanstack/react-query';
import type { PasswordResetInput, SignInInput, SignUpInput } from '@borneo/shared';
import {
  getSession,
  postReset,
  postResetRequest,
  postSignIn,
  postSignOut,
  postSignUp,
} from '../api/authApi';
import type { DemoEmail, SessionCustomer } from '../model';

/**
 * Who is signed in. Prefetched by the root route (SSR forwards the cookie). Customer data lives
 * under the `['me']` query key, which is dropped whenever the session changes.
 */
export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: async (): Promise<SessionCustomer> => (await getSession()).customer,
  staleTime: 60_000,
});

export const CUSTOMER_DATA_KEY = ['me'] as const;

export const signUp = async (input: SignUpInput) => (await postSignUp(input)).customer;
export const signIn = async (input: SignInInput) => (await postSignIn(input)).customer;
export const signOut = postSignOut;

/** Null outside demo mode, or when no account uses the email. */
export const requestPasswordReset = async (email: string): Promise<DemoEmail | null> =>
  (await postResetRequest(email)).demo ?? null;

export const resetPassword = (input: PasswordResetInput) => postReset(input);
