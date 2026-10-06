import { z } from 'zod';

export const paiseSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const bpsSchema = z.number().int().min(0).max(10_000);
/** Indian PIN code: 6 digits, first digit 1–9. */
export const pincodeSchema = z.string().regex(/^[1-9][0-9]{5}$/, 'Enter a 6-digit pincode');
export const epochMsSchema = z.number().int().nonnegative();
export const idSchema = z.string().min(1);

export function isValidPincode(value: string): boolean {
  return pincodeSchema.safeParse(value).success;
}
