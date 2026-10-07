import {
  RESET_CODE_TTL_SECONDS,
  toCustomerId,
  type Customer,
  type CustomerId,
  type DemoMessage,
} from '@borneo/shared';
import type { NotificationAdapter } from '../../adapters/notifications/index';

/** A signed-in customer plus the `Set-Cookie` values that carry the session. */
export type IssuedSession = { customer: Customer; cookies: string[] };

/**
 * Identity provider port, implemented with Better Auth in `src/session/`. Cookies pass through
 * as opaque strings; only that module reads them. Failures are AppErrors with stable codes.
 */
export type IdentityPort = {
  /** 409 EMAIL_TAKEN */
  signUp(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<IssuedSession>;
  /** 401 INVALID_CREDENTIALS */
  signIn(input: { email: string; password: string }): Promise<IssuedSession>;
  /** Ends this device's session; returns cookies that clear it. */
  signOut(cookieHeader: string | undefined): Promise<string[]>;
  current(cookieHeader: string | undefined): Promise<IssuedSession | null>;
  /** A fresh reset code (replacing any earlier one), or null when no account uses the email. */
  issueResetCode(
    email: string,
  ): Promise<{ customerId: CustomerId; email: string; code: string } | null>;
  /** 400 INVALID_CODE (wrong, expired or out of tries). Signs the customer out everywhere. */
  resetPassword(input: { email: string; code: string; password: string }): Promise<{
    customerId: CustomerId;
    email: string;
  }>;
  /** 401 UNAUTHENTICATED. Name and mobile only; the email stays (D-223). */
  updateProfile(
    cookieHeader: string | undefined,
    input: { name: string; phone: string },
  ): Promise<IssuedSession>;
  /** 400 WRONG_PASSWORD. Signs out every other device; returns this device's new cookies. */
  changePassword(
    cookieHeader: string | undefined,
    input: { currentPassword: string; newPassword: string },
  ): Promise<IssuedSession>;
};

export type AuthDeps = {
  identity: IdentityPort;
  notifications: NotificationAdapter;
};

export function createAuthService(deps: AuthDeps) {
  return {
    signUp: deps.identity.signUp,
    signIn: deps.identity.signIn,
    signOut: deps.identity.signOut,
    current: deps.identity.current,
    updateProfile: deps.identity.updateProfile,

    /** D-223: the customer is told, as with a reset (D-98). */
    async changePassword(
      cookieHeader: string | undefined,
      input: { currentPassword: string; newPassword: string },
    ): Promise<IssuedSession> {
      const issued = await deps.identity.changePassword(cookieHeader, input);
      await deps.notifications.send({
        customerId: toCustomerId(issued.customer.id),
        email: issued.customer.email,
        kind: 'password_changed',
        title: 'Your password was changed',
        body: 'Your Borneo password was changed from your account and other devices were signed out. If this wasn’t you, reset your password now.',
      });
      return issued;
    },

    /**
     * Sends a reset code (D-92, D-98). The answer never says whether the email has an account;
     * in demo mode the on-screen box shows the message instead (D-95).
     */
    async requestPasswordReset(email: string): Promise<{ demo?: DemoMessage }> {
      const issued = await deps.identity.issueResetCode(email);
      if (!issued) return {};
      const minutes = RESET_CODE_TTL_SECONDS / 60;
      const demo = await deps.notifications.send({
        customerId: issued.customerId,
        email: issued.email,
        kind: 'password_reset',
        title: 'Reset your Borneo password',
        body: 'Someone asked to reset your password. If it wasn’t you, ignore this: your password hasn’t changed.',
        secret: {
          code: issued.code,
          text: `Your reset code is ${issued.code}. It expires in ${minutes} minutes.`,
        },
      });
      return demo ? { demo } : {};
    },

    /** Sets the new password, signs out every device and tells the customer (D-98). */
    async resetPassword(input: { email: string; code: string; password: string }): Promise<void> {
      const { customerId, email } = await deps.identity.resetPassword(input);
      await deps.notifications.send({
        customerId,
        email,
        kind: 'password_changed',
        title: 'Your password was changed',
        body: 'Your Borneo password was just changed and every device was signed out. If this wasn’t you, reset your password now.',
      });
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
