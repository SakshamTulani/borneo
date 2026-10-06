import { AsyncLocalStorage } from 'node:async_hooks';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins/email-otp';
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  RESET_CODE_ATTEMPTS,
  RESET_CODE_LENGTH,
  RESET_CODE_TTL_SECONDS,
  toCustomerId,
  type Customer,
} from '@borneo/shared';
import type { Db } from '../db/client';
import { account, session, user, verification } from '../db/schema/index';
import { AppError } from '../errors';
import type { IdentityPort, IssuedSession } from '../modules/auth/index';

export type AuthConfig = {
  secret: string;
  /** Public URL of the API as the browser sees it (web origin + `/api`); https makes cookies Secure. */
  baseURL: string;
};

/** Sessions last 7 days and are extended at most once a day while used (D-97). */
const SESSION_DAYS = 7;

/**
 * Better Auth, used as a library: its HTTP handler is not mounted. Our routes call it and keep
 * our contracts, error shape and rate limits (D-190).
 */
export function createBetterAuth(db: Db, config: AuthConfig) {
  // Captures the reset code Better Auth would email, for the NotificationAdapter to send.
  const outbox = new AsyncLocalStorage<{ code?: string }>();

  const auth = betterAuth({
    secret: config.secret,
    baseURL: config.baseURL,
    basePath: '/auth',
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    user: { additionalFields: { phone: { type: 'string', required: false, input: true } } },
    session: { expiresIn: SESSION_DAYS * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
    emailAndPassword: {
      enabled: true,
      // Demo: email is an identifier only (D-93). Production must verify (blocker D-94).
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: PASSWORD_MAX,
      revokeSessionsOnPasswordReset: true,
    },
    plugins: [
      emailOTP({
        otpLength: RESET_CODE_LENGTH,
        expiresIn: RESET_CODE_TTL_SECONDS,
        allowedAttempts: RESET_CODE_ATTEMPTS,
        storeOTP: 'hashed',
        disableSignUp: true,
        async sendVerificationOTP({ otp, type }) {
          const pending = outbox.getStore();
          if (pending && type === 'forget-password') pending.code = otp;
        },
      }),
    ],
    advanced: { cookiePrefix: 'borneo' },
    rateLimit: { enabled: false },
    telemetry: { enabled: false },
    logger: { level: 'error' },
  });

  return { auth, outbox };
}

export type BetterAuth = ReturnType<typeof createBetterAuth>;

type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phone?: string | null | undefined;
};

const toCustomer = (u: AuthUser): Customer => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone ?? null,
  emailVerified: u.emailVerified,
});

const cookieHeaders = (cookieHeader: string | undefined) =>
  new Headers(cookieHeader ? { cookie: cookieHeader } : {});

/** Better Auth's error code, if `e` is one of its API errors. */
function authCode(e: unknown): string | undefined {
  const body = (e as { body?: { code?: unknown } } | null)?.body;
  return typeof body?.code === 'string' ? body.code : undefined;
}

/** Maps Better Auth failures onto our stable codes; anything unexpected is rethrown (500). */
function rethrow(e: unknown, map: Record<string, AppError>): never {
  const code = authCode(e);
  throw (code && map[code]) || e;
}

const emailTaken = new AppError(
  409,
  'EMAIL_TAKEN',
  'An account already uses this email. Sign in instead.',
);
const badCredentials = new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
const badCode = new AppError(
  400,
  'INVALID_CODE',
  'That code is wrong or has expired. Ask for a new one.',
);

/** The identity port for the auth module, backed by Better Auth. */
export function betterAuthIdentity({ auth, outbox }: BetterAuth): IdentityPort {
  const issued = (u: AuthUser, headers: Headers): IssuedSession => ({
    customer: toCustomer(u),
    cookies: headers.getSetCookie(),
  });

  return {
    async signUp(input) {
      try {
        const { response, headers } = await auth.api.signUpEmail({
          body: input,
          returnHeaders: true,
        });
        return issued(response.user, headers);
      } catch (e) {
        rethrow(e, {
          USER_ALREADY_EXISTS: emailTaken,
          USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: emailTaken,
        });
      }
    },

    async signIn(input) {
      try {
        const { response, headers } = await auth.api.signInEmail({
          body: input,
          returnHeaders: true,
        });
        return issued(response.user, headers);
      } catch (e) {
        rethrow(e, { INVALID_EMAIL_OR_PASSWORD: badCredentials });
      }
    },

    async signOut(cookieHeader) {
      const { headers } = await auth.api.signOut({
        headers: cookieHeaders(cookieHeader),
        returnHeaders: true,
      });
      return headers.getSetCookie();
    },

    async current(cookieHeader) {
      if (!cookieHeader) return null;
      const { response, headers } = await auth.api.getSession({
        headers: cookieHeaders(cookieHeader),
        returnHeaders: true,
      });
      return response ? issued(response.user, headers) : null;
    },

    async issueResetCode(email) {
      const pending: { code?: string } = {};
      await outbox.run(pending, () => auth.api.requestPasswordResetEmailOTP({ body: { email } }));
      if (!pending.code) return null;
      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(email);
      return found
        ? { customerId: toCustomerId(found.user.id), email: found.user.email, code: pending.code }
        : null;
    },

    async resetPassword(input) {
      try {
        await auth.api.resetPasswordEmailOTP({
          body: { email: input.email, otp: input.code, password: input.password },
        });
      } catch (e) {
        rethrow(e, {
          INVALID_OTP: badCode,
          OTP_EXPIRED: badCode,
          TOO_MANY_ATTEMPTS: badCode,
          USER_NOT_FOUND: badCode,
        });
      }
      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(input.email);
      if (!found) throw badCode;
      return { customerId: toCustomerId(found.user.id), email: found.user.email };
    },
  };
}
