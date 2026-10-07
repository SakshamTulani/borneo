import { z } from 'zod';
import { RETURN_PHOTO_MAX, TRACKING_STEPS } from '../rules/postPurchase';
import { mobileSchema, passwordSchema, personNameSchema } from './account';
import { productSummarySchema } from './catalog';
import { epochMsSchema, idSchema, pageSchema, paiseSchema } from './common';
import { orderStatusSchema } from './orders';

// After the order (Phase L): tracking, cancel, returns, reviews, owned devices, Watch, profile.

export const trackingStepSchema = z.enum(TRACKING_STEPS);

/** The order's tracking timeline and courier (D-215). */
export const trackingViewSchema = z.object({
  steps: z.array(
    z.object({
      step: trackingStepSchema,
      at: epochMsSchema.nullable(),
      state: z.enum(['done', 'current', 'upcoming']),
    }),
  ),
  /** Once shipped. */
  courier: z.string().nullable(),
  trackingNo: z.string().nullable(),
});
export type TrackingView = z.infer<typeof trackingViewSchema>;

export const returnKindSchema = z.enum(['return', 'replacement']);
export const returnReasonSchema = z.enum(['defect', 'damage', 'changedMind', 'other']);
export const returnStatusSchema = z.enum(['requested', 'approved', 'rejected', 'completed']);

/** A return or replacement request as the customer sees it (D-86, D-219). */
export const returnRequestViewSchema = z.object({
  id: idSchema,
  orderId: idSchema,
  orderNumber: z.string(),
  orderItemId: idSchema,
  productName: z.string(),
  kind: returnKindSchema,
  reason: returnReasonSchema,
  details: z.string().nullable(),
  photoCount: z.number().int().min(0),
  status: returnStatusSchema,
  /** Paid back when a return completes on a prepaid order (D-219). */
  refundPaise: paiseSchema.nullable(),
  createdAt: epochMsSchema,
  updatedAt: epochMsSchema,
  /** Demo only: the status the demo support desk's "Advance" moves to (D-219). */
  demoNextStatus: returnStatusSchema.nullable(),
});
export type ReturnRequestView = z.infer<typeof returnRequestViewSchema>;

/** What may still be asked for on a delivered line (D-217). */
export const returnOptionSchema = z.object({
  kind: returnKindSchema,
  reasons: z.array(returnReasonSchema),
});

/** Per order line, after delivery: the open request and what can still be asked (D-217). */
export const orderItemAfterSaleSchema = z.object({
  returnWindowEndsAt: epochMsSchema.nullable(),
  returnRequest: returnRequestViewSchema.nullable(),
  returnOptions: z.array(returnOptionSchema),
});

export const refundViewSchema = z.object({
  amountPaise: paiseSchema,
  status: z.enum(['pending', 'processed', 'failed']),
  reason: z.string(),
  at: epochMsSchema,
});
export type RefundView = z.infer<typeof refundViewSchema>;

/** One order in the account list (newest first). */
export const orderSummarySchema = z.object({
  id: idSchema,
  number: z.string(),
  status: orderStatusSchema,
  placedAt: epochMsSchema,
  totalPaise: paiseSchema,
  itemCount: z.number().int().nonnegative(),
  /** Up to 3 product names and photos, for the list row. */
  items: z.array(
    z.object({
      name: z.string(),
      image: z.object({ src: z.string(), alt: z.string() }).nullable(),
    }),
  ),
  eta: z.object({ from: z.string(), to: z.string() }).nullable(),
  deliveredAt: epochMsSchema.nullable(),
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export const orderPageSchema = pageSchema(orderSummarySchema);
export type OrderPage = z.infer<typeof orderPageSchema>;
export const orderListQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * `POST /me/orders/:orderId/items/:itemId/returns`. Photos travel as base64 in JSON (no upload
 * library yet, D-218); the API checks count, size and file content (D-217).
 */
export const returnRequestInputSchema = z.object({
  kind: returnKindSchema,
  reason: returnReasonSchema,
  details: z.string().trim().max(1000).optional(),
  photos: z
    .array(z.string().max(3_000_000, 'Each photo must be 2 MB or smaller'))
    .max(RETURN_PHOTO_MAX, `Add at most ${RETURN_PHOTO_MAX} photos`)
    .default([]),
});
export type ReturnRequestInput = z.input<typeof returnRequestInputSchema>;

export const returnPageSchema = pageSchema(returnRequestViewSchema);
/** `?cursor=&limit=` for the account's own lists (returns, written reviews). */
export const accountPageQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/** A product the customer can review: received and not yet reviewed (D-151, D-221). */
export const reviewPromptSchema = z.object({
  orderItemId: idSchema,
  productId: idSchema,
  productName: z.string(),
  slug: z.string(),
  image: z.object({ src: z.string(), alt: z.string() }).nullable(),
  deliveredAt: epochMsSchema,
});
export type ReviewPrompt = z.infer<typeof reviewPromptSchema>;

export const myReviewSchema = z.object({
  id: idSchema,
  productName: z.string(),
  slug: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().nullable(),
  body: z.string().nullable(),
  authorName: z.string(),
  createdAt: epochMsSchema,
});
export type MyReview = z.infer<typeof myReviewSchema>;

/** `GET /me/reviews`: prompts (first page only) and a page of the reviews already written. */
export const myReviewsSchema = z.object({
  prompts: z.array(reviewPromptSchema),
  reviews: z.array(myReviewSchema),
  nextCursor: z.string().nullable(),
});
export type MyReviews = z.infer<typeof myReviewsSchema>;

export const reviewInputSchema = z.object({
  orderItemId: idSchema,
  rating: z.number().int().min(1, 'Choose a rating').max(5),
  title: z.string().trim().max(80, 'Keep the title under 80 characters').optional(),
  body: z.string().trim().max(2000, 'Keep the review under 2000 characters').optional(),
});
export type ReviewInput = z.input<typeof reviewInputSchema>;

/** A compatible add-on for an owned device, with its reason (D-124, D-220). */
export const deviceAccessorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  pricePaise: paiseSchema,
  image: z.object({ src: z.string(), alt: z.string() }).nullable(),
  reason: z.string(),
});

/** An owned device: a delivered product the customer kept (D-24, D-220). */
export const ownedDeviceSchema = z.object({
  productId: idSchema,
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  options: z.record(z.string(), z.string()),
  image: z.object({ src: z.string(), alt: z.string() }).nullable(),
  orderId: idSchema,
  orderNumber: z.string(),
  deliveredAt: epochMsSchema,
  returnWindowEndsAt: epochMsSchema.nullable(),
  accessories: z.array(deviceAccessorySchema),
});
export type OwnedDevice = z.infer<typeof ownedDeviceSchema>;
export const ownedDevicesSchema = z.object({ items: z.array(ownedDeviceSchema) });

/** One watched variant with where it stands now (D-147, D-222). */
export const watchItemSchema = z.object({
  sku: z.string(),
  slug: z.string(),
  name: z.string(),
  options: z.record(z.string(), z.string()),
  image: z.object({ src: z.string(), alt: z.string() }).nullable(),
  pricePaise: paiseSchema,
  availability: z.enum(['inStock', 'outOfStock', 'preorder', 'unavailable']),
  createdAt: epochMsSchema,
});
export type WatchItem = z.infer<typeof watchItemSchema>;
export const watchListSchema = z.object({ items: z.array(watchItemSchema) });
export type WatchList = z.infer<typeof watchListSchema>;
export const watchParamsSchema = z.object({ sku: z.string().min(1).max(60) });

/** Account counts for the overview. */
export const accountSummarySchema = z.object({
  orders: z.number().int().nonnegative(),
  activeOrders: z.number().int().nonnegative(),
  devices: z.number().int().nonnegative(),
  reviewPrompts: z.number().int().nonnegative(),
  watching: z.number().int().nonnegative(),
  openReturns: z.number().int().nonnegative(),
  memberSince: epochMsSchema,
});
export type AccountSummary = z.infer<typeof accountSummarySchema>;

/** `PATCH /me/profile` (D-223): name and mobile; email is the sign-in identifier and stays. */
export const profileInputSchema = z.object({ name: personNameSchema, phone: mobileSchema });
export type ProfileInput = z.input<typeof profileInputSchema>;

/** `POST /me/password` (D-223). */
export const passwordChangeInputSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(128),
  newPassword: passwordSchema,
});
export type PasswordChangeInput = z.input<typeof passwordChangeInputSchema>;

/** One saved product (D-235), priced and stocked as listings are. */
export const wishlistItemSchema = z.object({
  product: productSummarySchema,
  addedAt: epochMsSchema,
});
export const wishlistPageSchema = pageSchema(wishlistItemSchema).extend({
  total: z.number().int().nonnegative(),
});
export type WishlistPage = z.infer<typeof wishlistPageSchema>;
/** Slugs on the wishlist, for the hearts on cards and product pages. */
export const wishlistSlugsSchema = z.object({ slugs: z.array(z.string()) });
export const wishlistParamsSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) });
