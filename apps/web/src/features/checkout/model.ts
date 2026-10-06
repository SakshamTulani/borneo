import type { CheckoutQuery, CheckoutView, OrderView, PaymentMethod } from '@borneo/shared';

export type { CheckoutView, OrderView, PaymentMethod };

/** The customer's choices, kept in the URL so a refresh or address change keeps them (D-55). */
export type CheckoutChoice = CheckoutQuery;
