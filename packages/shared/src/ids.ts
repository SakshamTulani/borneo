declare const customerIdBrand: unique symbol;

/** Customer identity. Repositories for customer-owned data take this as their first param (ADR-0005). */
export type CustomerId = string & { readonly [customerIdBrand]: true };

export function toCustomerId(value: string): CustomerId {
  if (value.length === 0) throw new Error('CustomerId cannot be empty');
  return value as CustomerId;
}
