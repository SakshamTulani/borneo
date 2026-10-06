import type { Customer, DemoMessage } from '@borneo/shared';

/** The signed-in customer, or null when signed out. */
export type SessionCustomer = Customer | null;

/** The on-screen stand-in for an email in demo mode (D-95). */
export type DemoEmail = DemoMessage;
