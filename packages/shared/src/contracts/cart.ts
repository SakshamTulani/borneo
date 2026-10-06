import { z } from 'zod';
import { idSchema, paiseSchema } from './common';

/**
 * A priced cart line. `priceSource` says which price the unit price came from:
 * coupons apply only to regular lines (D-36, D-37); bundles never take flash prices (D-39).
 */
export const cartLineSchema = z
  .object({
    lineId: idSchema,
    kind: z.enum(['item', 'bundle']),
    /** One category for items; every member's category for bundles. */
    categoryIds: z.array(idSchema).min(1),
    qty: z.number().int().positive(),
    unitPricePaise: paiseSchema,
    priceSource: z.enum(['regular', 'flash', 'bundle']),
    isPreorder: z.boolean().default(false),
  })
  .refine(
    (l) => (l.kind === 'bundle') === (l.priceSource === 'bundle'),
    'bundle lines use bundle prices, item lines never do',
  );
export type CartLine = z.infer<typeof cartLineSchema>;
