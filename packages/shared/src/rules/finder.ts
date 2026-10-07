import type { AttributeDef, Attributes } from '../contracts/catalog';
import { formatAttributeValue } from './catalog';

/** What one answer asks of a product (D-225). Only structured attributes, never text (D-22). */
export type FinderConstraint =
  | { kind: 'price'; minPaise?: number; maxPaise?: number }
  | { kind: 'require'; attr: string; anyOf: (string | boolean)[] }
  | { kind: 'prefer'; attr: string; direction: 'high' | 'low' }
  | { kind: 'none' };

export type FinderOption = {
  value: string;
  label: string;
  detail?: string;
  constraints: FinderConstraint[];
};
export type FinderQuestion = {
  key: string;
  prompt: string;
  multi: boolean;
  options: FinderOption[];
};
export type FinderDefinition = { id: string; title: string; questions: FinderQuestion[] };

const RUPEE = 100;
const budget = (bands: [string, string, number | undefined, number | undefined][]) => ({
  key: 'budget',
  prompt: 'What would you like to spend?',
  multi: false,
  options: [
    ...bands.map(([value, label, min, max]) => ({
      value,
      label,
      constraints: [
        {
          kind: 'price' as const,
          ...(min !== undefined ? { minPaise: min * RUPEE } : {}),
          ...(max !== undefined ? { maxPaise: max * RUPEE } : {}),
        },
      ],
    })),
    { value: 'any', label: 'No fixed budget', constraints: [{ kind: 'none' as const }] },
  ],
});

/** Guided finders for the full-depth categories (D-13, D-225). Config, not code paths per product. */
export const FINDERS: Record<string, FinderDefinition> = {
  phones: {
    id: 'phones',
    title: 'Find your phone',
    questions: [
      budget([
        ['under20', 'Under ₹20,000', undefined, 20_000],
        ['20to40', '₹20,000 to ₹40,000', 20_000, 40_000],
        ['over40', 'Over ₹40,000', 40_000, undefined],
      ]),
      {
        key: 'priority',
        prompt: 'What matters most?',
        multi: false,
        options: [
          {
            value: 'battery',
            label: 'Battery life',
            detail: 'Lasts the longest between charges',
            constraints: [{ kind: 'prefer', attr: 'battery_mah', direction: 'high' }],
          },
          {
            value: 'camera',
            label: 'Camera',
            detail: 'The most detailed main camera',
            constraints: [{ kind: 'prefer', attr: 'main_camera_mp', direction: 'high' }],
          },
          {
            value: 'speed',
            label: 'Speed and gaming',
            detail: 'More memory and a smoother screen',
            constraints: [
              { kind: 'prefer', attr: 'ram_gb', direction: 'high' },
              { kind: 'prefer', attr: 'refresh_rate_hz', direction: 'high' },
            ],
          },
          {
            value: 'compact',
            label: 'Easy to hold',
            detail: 'Smaller and lighter',
            constraints: [
              { kind: 'prefer', attr: 'display_size_in', direction: 'low' },
              { kind: 'prefer', attr: 'weight_g', direction: 'low' },
            ],
          },
          { value: 'balanced', label: 'A bit of everything', constraints: [{ kind: 'none' }] },
        ],
      },
      {
        key: 'needs',
        prompt: 'Anything it must have?',
        multi: true,
        options: [
          {
            value: '5g',
            label: '5G',
            constraints: [{ kind: 'require', attr: 'five_g', anyOf: [true] }],
          },
          {
            value: 'nfc',
            label: 'Tap to pay (NFC)',
            constraints: [{ kind: 'require', attr: 'nfc', anyOf: [true] }],
          },
          {
            value: 'wireless',
            label: 'Wireless charging',
            constraints: [{ kind: 'require', attr: 'wireless_charging', anyOf: [true] }],
          },
          {
            value: 'water',
            label: 'Survives rain and dunks',
            detail: 'IP64 or IP68',
            constraints: [{ kind: 'require', attr: 'ip_rating', anyOf: ['IP64', 'IP68'] }],
          },
        ],
      },
    ],
  },
  audio: {
    id: 'audio',
    title: 'Find your audio',
    questions: [
      {
        key: 'type',
        prompt: 'What kind?',
        multi: false,
        options: [
          {
            value: 'tws',
            label: 'Earbuds',
            detail: 'Tiny, wire-free, in a pocket case',
            constraints: [{ kind: 'require', attr: 'form_factor', anyOf: ['tws'] }],
          },
          {
            value: 'neckband',
            label: 'Neckband',
            detail: 'Around your neck, hard to lose',
            constraints: [{ kind: 'require', attr: 'form_factor', anyOf: ['neckband'] }],
          },
          {
            value: 'over_ear',
            label: 'Headphones',
            detail: 'Over the ear, the most comfortable for hours',
            constraints: [{ kind: 'require', attr: 'form_factor', anyOf: ['over_ear'] }],
          },
          {
            value: 'speaker',
            label: 'Speaker',
            detail: 'For the room, not your ears',
            constraints: [{ kind: 'require', attr: 'form_factor', anyOf: ['speaker'] }],
          },
          { value: 'any', label: 'Not sure yet', constraints: [{ kind: 'none' }] },
        ],
      },
      {
        key: 'use',
        prompt: 'What will you use it for?',
        multi: true,
        options: [
          {
            value: 'commute',
            label: 'Commute and travel',
            detail: 'Active noise cancellation',
            constraints: [{ kind: 'require', attr: 'anc', anyOf: [true] }],
          },
          {
            value: 'workout',
            label: 'Workouts',
            detail: 'Sweat and splash resistant (IPX5 or better)',
            constraints: [
              { kind: 'require', attr: 'water_resistance', anyOf: ['IPX5', 'IP55', 'IP67'] },
            ],
          },
          {
            value: 'calls',
            label: 'Calls on phone and laptop',
            detail: 'Connected to two devices at once',
            constraints: [{ kind: 'require', attr: 'multipoint', anyOf: [true] }],
          },
          {
            value: 'hires',
            label: 'Hi-res music',
            detail: 'LDAC, on Android phones that support it',
            constraints: [{ kind: 'require', attr: 'codecs', anyOf: ['LDAC'] }],
          },
          {
            value: 'battery',
            label: 'Long listening',
            detail: 'The longest playback',
            constraints: [{ kind: 'prefer', attr: 'playback_hours', direction: 'high' }],
          },
        ],
      },
      budget([
        ['under3', 'Under ₹3,000', undefined, 3_000],
        ['3to8', '₹3,000 to ₹8,000', 3_000, 8_000],
        ['over8', 'Over ₹8,000', 8_000, undefined],
      ]),
    ],
  },
};

/** Answers as chosen: question key → option values (one, or several for multi questions). */
export type FinderAnswers = Record<string, string[]>;

export type FinderCandidate = {
  id: string;
  attributes: Attributes;
  /** Lowest regular price (D-19). */
  pricePaise: number;
  launched: string;
};

const matches = (value: unknown, anyOf: (string | boolean)[]) =>
  Array.isArray(value)
    ? value.some((v) => anyOf.includes(v as string))
    : anyOf.includes(value as string);

function constraintsOf(def: FinderDefinition, answers: FinderAnswers) {
  return def.questions.flatMap((q) =>
    q.options
      .filter((o) => (answers[q.key] ?? []).includes(o.value))
      .flatMap((o) => o.constraints.map((c) => ({ question: q, option: o, c }))),
  );
}

type Hard = Extract<FinderConstraint, { kind: 'price' | 'require' }>;
const passes = (p: FinderCandidate, c: Hard) =>
  c.kind === 'price'
    ? (c.minPaise === undefined || p.pricePaise >= c.minPaise) &&
      (c.maxPaise === undefined || p.pricePaise < c.maxPaise)
    : matches(p.attributes[c.attr], c.anyOf);

/**
 * Guided finder (D-13, D-22, D-225): products that meet every hard answer (budget and must-haves),
 * ranked by the preferences (each scored by rank among the matches), then newest, then cheaper.
 * Every match carries reasons naming the structured facts it was picked on. When nothing matches,
 * `relax` names the one answer whose removal would give the most results.
 */
export function runFinder(
  def: FinderDefinition,
  answers: FinderAnswers,
  candidates: FinderCandidate[],
  defs: AttributeDef[],
): {
  matches: { id: string; reasons: string[] }[];
  relax: { question: string; option: string; count: number } | null;
} {
  const all = constraintsOf(def, answers);
  const hard = all.filter(
    (x): x is typeof x & { c: Hard } => x.c.kind === 'price' || x.c.kind === 'require',
  );
  const prefer = all.flatMap((x) => (x.c.kind === 'prefer' ? [x.c] : []));
  const fit = candidates.filter((p) => hard.every((h) => passes(p, h.c)));
  const byKey = new Map(defs.map((d) => [d.key, d]));

  const score = (p: FinderCandidate) =>
    prefer.reduce((sum, c) => {
      const values = fit
        .map((q) => q.attributes[c.attr])
        .filter((v): v is number => typeof v === 'number');
      const v = p.attributes[c.attr];
      if (typeof v !== 'number' || values.length < 2) return sum;
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (max === min) return sum;
      const norm = (v - min) / (max - min);
      return sum + (c.direction === 'high' ? norm : 1 - norm);
    }, 0);

  const ranked = fit
    .map((p) => ({ p, s: score(p) }))
    .sort(
      (a, b) =>
        b.s - a.s || b.p.launched.localeCompare(a.p.launched) || a.p.pricePaise - b.p.pricePaise,
    );

  const fact = (p: FinderCandidate, attr: string) => {
    const d = byKey.get(attr);
    const value = d ? formatAttributeValue(d, p.attributes[attr]) : undefined;
    return d && value !== undefined ? `${d.label}: ${value}` : undefined;
  };
  const reasonsFor = (p: FinderCandidate) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of all) {
      const text =
        x.c.kind === 'require' || x.c.kind === 'prefer'
          ? fact(p, x.c.attr)
          : x.c.kind === 'price'
            ? `Within ${x.option.label.toLowerCase()}`
            : undefined;
      if (text && !seen.has(text)) {
        seen.add(text);
        out.push(text);
      }
    }
    return out;
  };

  let relax: { question: string; option: string; count: number } | null = null;
  if (fit.length === 0)
    for (const h of hard) {
      const count = candidates.filter((p) => hard.every((o) => o === h || passes(p, o.c))).length;
      if (count > 0 && (!relax || count > relax.count))
        relax = { question: h.question.key, option: h.option.value, count };
    }
  return { matches: ranked.map(({ p }) => ({ id: p.id, reasons: reasonsFor(p) })), relax };
}
