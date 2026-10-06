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

/** Cursor-paginated list response (`?cursor=&limit=`, max 50). */
export const MAX_PAGE_LIMIT = 50;
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}

/** Every API error: `{ error: { code, message, details? } }` with a stable code. */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
