import { z } from 'zod';
import { productSummarySchema } from './catalog';
import { COMPARE_MAX } from '../rules/compare';

// Phones and audio depth (Phase M): finder, compare, explainers, upgrades.

export const explainerSchema = z.object({ title: z.string().min(1), body: z.string().min(1) });
export type Explainer = z.infer<typeof explainerSchema>;

/** A finder question as shown: no scoring details leave the API (D-225). */
export const finderQuestionViewSchema = z.object({
  key: z.string(),
  prompt: z.string(),
  multi: z.boolean(),
  options: z.array(
    z.object({ value: z.string(), label: z.string(), detail: z.string().nullable() }),
  ),
});

/** Answers in the query string: `?budget=under20&needs=5g,nfc` (D-225). */
export const finderQuerySchema = z.record(z.string(), z.string().max(200));

/** `GET /finder/:id`: the questions, and results once every question has an answer. */
export const finderViewSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.object({ slug: z.string(), name: z.string() }),
  questions: z.array(finderQuestionViewSchema),
  answers: z.record(z.string(), z.array(z.string())),
  complete: z.boolean(),
  results: z.array(z.object({ product: productSummarySchema, reasons: z.array(z.string()) })),
  /** Nothing fits: the answer whose removal gives the most results. */
  relax: z
    .object({ question: z.string(), option: z.string(), label: z.string(), count: z.number() })
    .nullable(),
  explainers: z.array(explainerSchema),
});
export type FinderView = z.infer<typeof finderViewSchema>;

export const compareQuerySchema = z.object({
  category: z.string().min(1).max(80),
  p: z
    .string()
    .max(400)
    .transform((s) => [...new Set(s.split(',').filter(Boolean))].slice(0, COMPARE_MAX)),
});

/** `GET /compare` (D-122, D-227). */
export const compareViewSchema = z.object({
  category: z.object({ slug: z.string(), name: z.string() }),
  products: z.array(productSummarySchema),
  rows: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      values: z.array(z.string().nullable()),
      differs: z.boolean(),
    }),
  ),
});
export type CompareView = z.infer<typeof compareViewSchema>;

/** Home strip (D-121, D-136): newest upgrade per owned line. */
export const upgradeStripSchema = z.object({
  items: z.array(
    z.object({
      from: z.object({ name: z.string(), slug: z.string() }),
      to: productSummarySchema,
    }),
  ),
});
export type UpgradeStripView = z.infer<typeof upgradeStripSchema>;

const diffSchema = z.object({
  label: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
});

/** `GET /me/upgrades/:slug`: the PDP badge and "what you gain" (D-130–133, D-226). */
export const upgradeForProductSchema = z.object({
  badge: z.object({ fromName: z.string(), fromSlug: z.string() }).nullable(),
  gains: z.array(diffSchema),
  changes: z.array(diffSchema),
});
export type UpgradeForProduct = z.infer<typeof upgradeForProductSchema>;
