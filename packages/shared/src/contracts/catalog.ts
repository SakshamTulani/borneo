import { z } from 'zod';
import { idSchema, paiseSchema } from './common';

/** Per-category config (D-89): phones and TVs are seeded replacementOnly (D-81), the rest return (D-83). */
export const returnPolicySchema = z.enum(['return', 'replacementOnly']);
export type ReturnPolicy = z.infer<typeof returnPolicySchema>;

export const familyTierSchema = z.enum(['standard', 'pro', 'premium']);
export type FamilyTier = z.infer<typeof familyTierSchema>;

export const attributeDefSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(['enum', 'number', 'bool', 'text', 'list']),
    unit: z.string().optional(),
    /** Marks attributes that may produce a compatibility fact (D-22). */
    compat: z.boolean().default(false),
  })
  .refine(
    (d) => !(d.compat && d.type === 'text'),
    'free-text attributes cannot be compatibility facts (D-22)',
  );
export type AttributeDef = z.infer<typeof attributeDefSchema>;

export const attributesSchema = z.record(z.string(), z.unknown());
export type Attributes = z.infer<typeof attributesSchema>;

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
