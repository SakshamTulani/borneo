import { z } from 'zod';
import { isPinInIndia } from '../rules/addresses';
import { idSchema, pincodeSchema } from './common';
import { mobileSchema, personNameSchema } from './account';

const line = (max: number) => z.string().trim().max(max);
/** Blank, missing or null all mean "none" (stored as null). */
const optionalLine = (max: number) =>
  line(max)
    .nullish()
    .transform((v) => (v ? v : null));

/** A delivery address with its exact map pin (D-53, D-189). */
export const addressInputSchema = z
  .object({
    name: personNameSchema,
    phone: mobileSchema,
    line1: line(120).min(1, 'Enter the house and street'),
    line2: optionalLine(120),
    landmark: optionalLine(120),
    city: line(60).min(1, 'Enter the city'),
    state: line(60).min(1, 'Enter the state'),
    pincode: pincodeSchema,
    lat: z.number({ error: 'Place the pin on the map' }).min(-90).max(90),
    lng: z.number({ error: 'Place the pin on the map' }).min(-180).max(180),
    isDefault: z.boolean().default(false),
  })
  .refine((a) => isPinInIndia(a), { message: 'Place the pin in India', path: ['lat'] });
export type AddressInput = z.input<typeof addressInputSchema>;
export type AddressFields = z.output<typeof addressInputSchema>;

export const addressSchema = z.object({
  id: idSchema,
  name: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  landmark: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  lat: z.number(),
  lng: z.number(),
  isDefault: z.boolean(),
});
export type Address = z.infer<typeof addressSchema>;

/** Bounded by MAX_ADDRESSES (D-188), so not paginated. Default first, then newest. */
export const addressListSchema = z.object({ items: z.array(addressSchema) });
export type AddressList = z.infer<typeof addressListSchema>;
