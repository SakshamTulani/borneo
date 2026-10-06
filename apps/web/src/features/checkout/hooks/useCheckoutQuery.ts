import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { checkoutQuery } from '../repository/checkoutRepository';
import type { CheckoutChoice } from '../model';

/** Checkout at the chosen address and payment; keeps showing the last answer while rechecking (D-55). */
export function useCheckoutQuery(choice: CheckoutChoice, enabled = true) {
  return useQuery({ ...checkoutQuery(choice), enabled, placeholderData: keepPreviousData });
}
