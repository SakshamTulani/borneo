import { z } from 'zod';
import { epochMsSchema, idSchema, pageSchema, paiseSchema } from './common';

/** Per-category config (D-89): phones and TVs are seeded replacementOnly (D-81), the rest return (D-83). */
export const returnPolicySchema = z.enum(['return', 'replacementOnly']);
export type ReturnPolicy = z.infer<typeof returnPolicySchema>;

export const familyTierSchema = z.enum(['standard', 'pro', 'premium']);
export type FamilyTier = z.infer<typeof familyTierSchema>;

export const attributeTypeSchema = z.enum(['enum', 'number', 'bool', 'text', 'list']);

export const attributeDefSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: attributeTypeSchema,
    unit: z.string().optional(),
    /** Allowed values for `enum` and `list` attributes. */
    options: z.array(z.string().min(1)).min(1).optional(),
    /** Display labels for options stored as codes (e.g. `usb_c` → "USB-C"). Missing = the option itself. */
    optionLabels: z.record(z.string(), z.string().min(1)).optional(),
    filterable: z.boolean().optional(),
    comparable: z.boolean().optional(),
    /** Marks attributes that may produce a compatibility fact (D-22). */
    compat: z.boolean().default(false),
  })
  .refine(
    (d) => !(d.compat && d.type === 'text'),
    'free-text attributes cannot be compatibility facts (D-22)',
  )
  .refine(
    (d) => (d.type !== 'enum' && d.type !== 'list') || d.options !== undefined,
    'enum and list attributes need their allowed options (D-16)',
  )
  .refine(
    (d) => Object.keys(d.optionLabels ?? {}).every((k) => d.options?.includes(k)),
    'option labels must name listed options (D-16)',
  );
export type AttributeDef = z.infer<typeof attributeDefSchema>;

export const attributesSchema = z.record(z.string(), z.unknown());
export type Attributes = z.infer<typeof attributesSchema>;

function valueSchema(def: AttributeDef): z.ZodType {
  const option = def.options ? z.enum(def.options as [string, ...string[]]) : z.string().min(1);
  switch (def.type) {
    case 'enum':
      return option;
    case 'number':
      return z.number().finite();
    case 'bool':
      return z.boolean();
    case 'text':
      return z.string();
    case 'list':
      return z.array(option);
  }
}

/**
 * A product's attributes must match its category's definitions: right type, a listed option,
 * no unknown keys (D-16). Every attribute is optional: missing means no claim (D-22).
 */
export function attributesSchemaFor(defs: AttributeDef[]) {
  return z.strictObject(Object.fromEntries(defs.map((d) => [d.key, valueSchema(d).optional()])));
}

/** Per-category page config (D-10, D-14): filters, spec groups and compare rows by attribute key. */
export const categoryConfigSchema = z.object({
  filters: z.array(z.string().min(1)),
  specGroups: z.array(
    z.object({ label: z.string().min(1), keys: z.array(z.string().min(1)).min(1) }),
  ),
  compare: z.array(z.string().min(1)),
  /** Guided finder id; full-depth categories only (D-13). */
  finder: z.string().min(1).optional(),
  /** Which home entry point lists this category (D-120). */
  homeEntry: z.enum(['helpMeChoose', 'buildYourSetup']).optional(),
  /** Brand-written guides for the category page and finder (D-228). */
  explainers: z.array(z.object({ title: z.string().min(1), body: z.string().min(1) })).optional(),
});
export type CategoryConfig = z.infer<typeof categoryConfigSchema>;

export const categoryDepthSchema = z.enum(['full', 'template']);
export const productTierSchema = z.enum(['value', 'upper_mid', 'premium']);
export const productStatusSchema = z.enum(['draft', 'live', 'preorder', 'discontinued']);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const productRefSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  categoryId: idSchema,
  lineId: idSchema,
  generation: z.number().int().positive(),
  familyTier: familyTierSchema,
  attributes: attributesSchema,
});
export type ProductRef = z.infer<typeof productRefSchema>;

export const relationTypeSchema = z.enum([
  'accessory',
  'compatible',
  'complementary',
  'replacement',
  'consumable',
  'upgrade',
  'prev_gen',
  'next_gen',
  'family_tier',
  'bundle_member',
]);
export type RelationType = z.infer<typeof relationTypeSchema>;

export const relationMatchSchema = z.discriminatedUnion('kind', [
  /** from.attributes[fromAttr] === to.attributes[toAttr], both filled. */
  z.object({ kind: z.literal('equal'), fromAttr: z.string(), toAttr: z.string() }),
  /** One side is a list containing the other side's value. */
  z.object({ kind: z.literal('contains'), fromAttr: z.string(), toAttr: z.string() }),
]);

export const relationRuleSchema = z.object({
  id: idSchema,
  type: relationTypeSchema,
  fromCategoryId: idSchema,
  toCategoryId: idSchema,
  match: relationMatchSchema,
  /** e.g. "Fits your {from}". Placeholders: {from}, {to}. */
  reasonTemplate: z.string().min(1),
});
export type RelationRule = z.infer<typeof relationRuleSchema>;

export const relationOverrideSchema = z.object({
  fromProductId: idSchema,
  toProductId: idSchema,
  type: relationTypeSchema,
  action: z.enum(['add', 'remove']),
  reason: z.string().min(1).optional(),
});
export type RelationOverride = z.infer<typeof relationOverrideSchema>;

export const relationEdgeSchema = z.object({
  fromProductId: idSchema,
  toProductId: idSchema,
  type: relationTypeSchema,
  source: z.enum(['rule', 'manual', 'line']),
  reason: z.string().min(1),
});
export type RelationEdge = z.infer<typeof relationEdgeSchema>;

export const emiPlanSchema = z.object({
  id: idSchema,
  bank: z.string().min(1),
  tenureMonths: z.number().int().positive(),
  annualRateBps: z.number().int().min(0),
  minAmountPaise: paiseSchema,
});
export type EmiPlan = z.infer<typeof emiPlanSchema>;

/** `GET /categories` item. */
export const categoryDtoSchema = z.object({
  id: idSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  parentId: idSchema.nullable(),
  depth: categoryDepthSchema,
  returnPolicy: returnPolicySchema,
  config: categoryConfigSchema,
});
export type CategoryDto = z.infer<typeof categoryDtoSchema>;

/** Everything a PriceBlock shows, decided by `priceDisplay` (D-30–33). */
export const priceDisplaySchema = z.object({
  /** Always the selling price (flash price while live). D-30. */
  sellingPaise: paiseSchema,
  priceSource: z.enum(['regular', 'flash']),
  mrpPaise: paiseSchema.optional(),
  savings: z.object({ paise: paiseSchema, percent: z.number().int().min(1).max(99) }).optional(),
  effective: z.object({ paise: paiseSchema, offerName: z.string().min(1) }).optional(),
  emiFromPaise: paiseSchema.optional(),
});
export type PriceDisplay = z.infer<typeof priceDisplaySchema>;

/** Anywhere in the country; pincode-level availability comes from serviceability (D-54). */
export const availabilitySchema = z.enum(['inStock', 'outOfStock', 'preorder']);
export type Availability = z.infer<typeof availabilitySchema>;

/** Verified-purchase reviews only (D-150): `average` is null until the first review. */
export const ratingSummarySchema = z.object({
  average: z.number().min(1).max(5).nullable(),
  count: z.number().int().nonnegative(),
});
export type RatingSummary = z.infer<typeof ratingSummarySchema>;

/** A live flash sale on the product (D-140). `lowStockCount` only from the real cap (D-148). */
export const flashBadgeSchema = z.object({
  endsAt: epochMsSchema,
  lowStockCount: z.number().int().positive().optional(),
});

/** A product photo: absolute URL plus alt text (D-14). The first one leads cards and the gallery. */
export const productImageSchema = z.object({
  src: z.httpUrl(),
  alt: z.string().min(1),
});
export type ProductImage = z.infer<typeof productImageSchema>;

/** Listing order (D-19). */
export const productSortSchema = z.enum(['newest', 'price_asc', 'price_desc']);
export type ProductSort = z.infer<typeof productSortSchema>;

/** `GET /products` item. Price is the lowest price payable now (D-19), shown per D-30–33. */
export const productSummarySchema = z.object({
  id: idSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  categorySlug: z.string().min(1),
  lineName: z.string().min(1),
  tier: productTierSchema,
  status: productStatusSchema,
  availability: availabilitySchema,
  price: priceDisplaySchema,
  flash: flashBadgeSchema.nullable(),
  rating: ratingSummarySchema,
  /** Lead photo; null until the product has media. */
  image: productImageSchema.nullable(),
});
export type ProductSummary = z.infer<typeof productSummarySchema>;

/** `GET /products`: one keyset page plus how many match across all pages ("24 of 45"). */
export const productListResponseSchema = pageSchema(productSummarySchema).extend({
  total: z.number().int().nonnegative(),
});

/** Category filters (D-18), parsed from query params named by attribute key. */
export type ListingFilter =
  | { key: string; kind: 'anyOf'; values: string[] }
  | { key: string; kind: 'isTrue' }
  | { key: string; kind: 'atLeast'; value: number };

/** What a category page can filter on, from listed products only (D-17, D-18). */
export const filterFacetSchema = z.discriminatedUnion('kind', [
  z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    kind: z.literal('anyOf'),
    options: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })),
  }),
  z.object({ key: z.string().min(1), label: z.string().min(1), kind: z.literal('isTrue') }),
  z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    kind: z.literal('atLeast'),
    unit: z.string().optional(),
    values: z.array(z.number().finite()),
  }),
]);
export type FilterFacet = z.infer<typeof filterFacetSchema>;

/** `GET /categories/:slug`. */
export const categoryDetailSchema = z.object({
  category: categoryDtoSchema,
  filters: z.array(filterFacetSchema),
  /** Lowest regular prices among listed products; null when the category is empty. */
  priceRangePaise: z.object({ min: paiseSchema, max: paiseSchema }).nullable(),
  /** "Up to" choices for the price filter, from `priceCaps` (D-18). */
  priceCapsPaise: z.array(paiseSchema),
});
export type CategoryDetail = z.infer<typeof categoryDetailSchema>;

export const specGroupSchema = z.object({
  title: z.string().min(1),
  /** `value` missing = "Not specified": never guessed (D-22). */
  rows: z.array(z.object({ label: z.string().min(1), value: z.string().optional() })),
});
export type SpecGroup = z.infer<typeof specGroupSchema>;

/** An offer as shown on a product page, with its status for that variant (D-34–36). */
export const productOfferSchema = z.object({
  id: idSchema,
  kind: z.enum(['bank', 'noCostEmi', 'coupon']),
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  minOrderPaise: paiseSchema.optional(),
  validTo: epochMsSchema,
  status: z.enum(['available', 'notApplicable']),
  reason: z.string().min(1).optional(),
});
export type ProductOffer = z.infer<typeof productOfferSchema>;

export const productVariantSchema = z.object({
  id: idSchema,
  sku: z.string().min(1),
  options: z.record(z.string(), z.string()),
  availability: availabilitySchema,
  price: priceDisplaySchema,
  flash: flashBadgeSchema.nullable(),
  offers: z.array(productOfferSchema),
});
export type ProductVariant = z.infer<typeof productVariantSchema>;

/** A fixed bundle offered on a member's product page (D-38, D-197). */
export const bundleOfferSchema = z.object({
  /** Cart line key, `bundle:<slug>`. */
  key: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  pricePaise: paiseSchema,
  /** The members at their regular prices. */
  separatePaise: paiseSchema,
  savingPaise: paiseSchema,
  items: z.array(
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      sku: z.string().min(1),
      options: z.record(z.string(), z.string()),
      qty: z.number().int().positive(),
      image: productImageSchema.nullable(),
    }),
  ),
});
export type BundleOffer = z.infer<typeof bundleOfferSchema>;

/** A verified review as shown (D-150): the reviewer's first name and initial only. */
export const reviewSchema = z.object({
  id: idSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string().nullable(),
  body: z.string().nullable(),
  author: z.string().min(1),
  createdAt: epochMsSchema,
});
export type Review = z.infer<typeof reviewSchema>;

/** `GET /products/:slug/reviews`: newest first. */
export const reviewPageSchema = z.object({
  items: z.array(reviewSchema),
  nextCursor: z.string().nullable(),
});
export type ReviewPage = z.infer<typeof reviewPageSchema>;

/** `GET /products/:slug`. */
export const productDetailSchema = z.object({
  id: idSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  modelNumber: z.string().min(1),
  lineName: z.string().min(1),
  tier: productTierSchema,
  status: productStatusSchema,
  category: z.object({ slug: z.string().min(1), name: z.string().min(1) }),
  /** Gallery, lead photo first; empty until the product has media. */
  images: z.array(productImageSchema),
  explainer: z.string().nullable(),
  whoFor: z.string().nullable(),
  notFor: z.string().nullable(),
  /** Pre-orders: expected dispatch, IST dates (D-64, D-146). */
  dispatch: z.object({ from: z.string(), to: z.string() }).nullable(),
  /** Option keys in display order, e.g. ["colour", "storage"]. */
  optionKeys: z.array(z.string().min(1)),
  variants: z.array(productVariantSchema).min(1),
  specs: z.array(specGroupSchema),
  compatibility: z.array(z.object({ key: z.string().min(1), text: z.string().min(1) })),
  /** Plain-language policy (D-84). */
  returnPolicy: z.string().min(1),
  faqs: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })),
  rating: ratingSummarySchema,
  /** Cross-sell with a reason each, at most 4 (D-123, D-124). */
  suggestions: z.array(z.object({ product: productSummarySchema, reason: z.string().min(1) })),
  /** Discontinued products point to their next generation, if any (D-17). */
  successor: z.object({ slug: z.string().min(1), name: z.string().min(1) }).nullable(),
  /** Bundles this product is in that can be bought now (D-197). */
  bundles: z.array(bundleOfferSchema),
  /** Newest verified reviews and how many there are at each star rating (D-150). */
  reviews: z.object({
    /** Index 0 = 1 star … index 4 = 5 stars. */
    counts: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
    page: reviewPageSchema,
  }),
});
export type ProductDetail = z.infer<typeof productDetailSchema>;
