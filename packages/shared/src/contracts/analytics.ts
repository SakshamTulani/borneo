import { z } from 'zod';

/**
 * Product analytics events (D-163, D-236): what shoppers do, never who they are. Props are
 * flat, short and carry no personal data (no names, emails, phones, addresses or free text).
 */
export const analyticsEventNameSchema = z.enum([
  'product_view',
  'add_to_cart',
  'begin_checkout',
  'search',
  'finder_complete',
  'compare_view',
  'wishlist_add',
  'deals_view',
]);
export type AnalyticsEventName = z.infer<typeof analyticsEventNameSchema>;

const propValue = z.union([z.string().max(80), z.number().finite(), z.boolean()]);

/** The only props each event may carry (D-236): product facts and counts, never a person. */
export const ANALYTICS_PROPS: Record<AnalyticsEventName, readonly string[]> = {
  product_view: ['slug'],
  add_to_cart: ['sku'],
  begin_checkout: [],
  search: ['query', 'results'],
  finder_complete: ['finder', 'results'],
  compare_view: ['category', 'products'],
  wishlist_add: ['slug'],
  deals_view: [],
};

export const analyticsEventSchema = z
  .object({
    name: analyticsEventNameSchema,
    props: z.record(z.string().regex(/^[a-zA-Z]{1,30}$/), propValue).default({}),
    /** Client time, epoch ms. */
    at: z.number().int().nonnegative(),
  })
  .refine((e) => Object.keys(e.props).every((k) => ANALYTICS_PROPS[e.name].includes(k)), {
    message: 'Prop not allowed for this event',
    path: ['props'],
  });
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

/** `POST /events`: a small batch from one browser; `anonymousId` is random, kept on the device. */
export const analyticsBatchSchema = z.object({
  anonymousId: z.string().regex(/^[a-z0-9-]{8,64}$/),
  events: z.array(analyticsEventSchema).min(1).max(20),
});
export type AnalyticsBatch = z.infer<typeof analyticsBatchSchema>;
