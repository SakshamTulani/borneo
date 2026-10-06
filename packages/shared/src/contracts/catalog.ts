import { z } from 'zod';
import { idSchema, paiseSchema } from './common';

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

/** `GET /products` item. Price fields are the cheapest variant's (D-30, D-31). */
export const productSummarySchema = z.object({
  id: idSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  categorySlug: z.string().min(1),
  tier: productTierSchema,
  status: productStatusSchema,
  pricePaise: paiseSchema,
  mrpPaise: paiseSchema,
});
export type ProductSummary = z.infer<typeof productSummarySchema>;
