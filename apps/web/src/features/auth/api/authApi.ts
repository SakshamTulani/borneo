import {
  authResponseSchema,
  passwordResetRequestResponseSchema,
  sessionResponseSchema,
  type AuthResponse,
  type PasswordResetInput,
  type PasswordResetRequestResponse,
  type SessionResponse,
  type SignInInput,
  type SignUpInput,
} from '@borneo/shared';
import { getJson, send, sendJson } from '../../../shared/lib/http';

export const getSession = (): Promise<SessionResponse> =>
  getJson('/session', sessionResponseSchema);

export const postSignUp = (input: SignUpInput): Promise<AuthResponse> =>
  sendJson('POST', '/auth/sign-up', input, authResponseSchema);

export const postSignIn = (input: SignInInput): Promise<AuthResponse> =>
  sendJson('POST', '/auth/sign-in', input, authResponseSchema);

export const postSignOut = () => send('POST', '/auth/sign-out');

export const postResetRequest = (email: string): Promise<PasswordResetRequestResponse> =>
  sendJson('POST', '/auth/password-reset/request', { email }, passwordResetRequestResponseSchema);

export const postReset = (input: PasswordResetInput) => send('POST', '/auth/password-reset', input);
