import type { Paise } from '../money';

/** A configurable synonym group (D-111): every synonym also means `term`. */
export type SynonymGroup = { term: string; synonyms: string[] };

export type SearchIntent = {
  /** Normalised query without the price phrase, e.g. "phone". */
  text: string;
  /** "under 30000" → 3,000,000 paise (D-113). */
  maxPricePaise?: Paise;
  /** `text` plus each synonym rewrite, most literal first (D-111). */
  terms: string[];
};

/** Lower case, NFKC, digit-group commas dropped ("30,000"), other punctuation to spaces (keeps `-`, `+` and `.` inside words), single spaces. */
export function normalizeQuery(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/[^\p{L}\p{N}+\-.₹\s]/gu, ' ')
    .replace(/(^|\s)[-+.]+|[-+.]+(?=\s|$)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const AMOUNT = String.raw`(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|hazaa?r|lakh|lac)?`;
/** "under 30000", "below ₹30k", "upto 1.5 lakh", "< 20000" */
const BEFORE = new RegExp(
  String.raw`(?:^|\s)(?:under|below|less than|upto|up to|within|max|maximum|<)\s*${AMOUNT}(?=\s|$)`,
);
/** Hinglish order: "30000 ke andar", "30k tak", "20000 se kam" */
const AFTER = new RegExp(String.raw`(?:^|\s)${AMOUNT}\s*(?:ke andar|ke neeche|tak|se kam)(?=\s|$)`);

function rupees(amount: string, unit: string | undefined): number | undefined {
  const n = Number(amount.replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const scale = !unit ? 1 : unit === 'lakh' || unit === 'lac' ? 100_000 : 1_000;
  return n * scale;
}

/** Basic price intent (D-113). Returns the query without the price phrase. */
export function parsePriceIntent(query: string): { text: string; maxPricePaise?: Paise } {
  for (const pattern of [BEFORE, AFTER]) {
    const m = pattern.exec(query);
    if (!m) continue;
    const value = rupees(m[1]!, m[2]);
    if (value === undefined) continue;
    const text = (query.slice(0, m.index) + ' ' + query.slice(m.index + m[0].length))
      .replace(/\s+/g, ' ')
      .trim();
    return { text, maxPricePaise: Math.round(value * 100) as Paise };
  }
  return { text: query };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The query plus one rewrite per matching synonym (D-111): "tws" → "earbuds",
 * "phone cover" → "case". Longer synonyms win over shorter ones inside them.
 */
export function expandSynonyms(text: string, groups: SynonymGroup[]): string[] {
  const terms = [text];
  const pairs = groups
    .flatMap((g) => g.synonyms.map((s) => ({ phrase: normalizeQuery(s), term: g.term })))
    .filter((p) => p.phrase && p.phrase !== p.term)
    .sort((a, b) => b.phrase.length - a.phrase.length);
  let rewritten = text;
  for (const { phrase, term } of pairs) {
    // Plurals count: "phones" is a synonym of "smartphone" too.
    const re = new RegExp(`(^|\\s)${escape(phrase)}s?(?=\\s|$)`, 'g');
    if (!re.test(rewritten)) continue;
    rewritten = rewritten.replace(re, `$1${term}`);
    if (!terms.includes(rewritten)) terms.push(rewritten);
  }
  return terms;
}

const singular = (s: string) => (s.endsWith('s') ? s.slice(0, -1) : s);

/**
 * The category a search term names outright (D-113): "phone" → Smartphones (via its synonym
 * "smartphone"), "tvs" → TVs. Only whole names, ignoring a plural "s"; "phone case" names none.
 */
export function namedCategory<C extends { slug: string; name: string }>(
  terms: string[],
  categories: C[],
): C | undefined {
  const wanted = new Set(terms.map((t) => singular(t)));
  return categories.find(
    (c) =>
      wanted.has(singular(normalizeQuery(c.name))) ||
      wanted.has(singular(c.slug.replace(/-/g, ' '))),
  );
}

/** Everything the search service needs from the raw query (D-111, D-113). */
export function searchIntent(raw: string, groups: SynonymGroup[]): SearchIntent {
  const { text, maxPricePaise } = parsePriceIntent(normalizeQuery(raw));
  return {
    text,
    ...(maxPricePaise !== undefined ? { maxPricePaise } : {}),
    terms: text ? expandSynonyms(text, groups) : [],
  };
}

/** Product names may drop the brand: "pulse 4" names the Borneo Pulse 4 (D-110). */
const BRAND = 'borneo ';

/**
 * Exact model name, model number or SKU (D-110), compared after normalising. A slug
 * ("pulse-4") counts too, since it is the model name in the URL. A SKU match names the variant
 * to open; other matches open the product's default variant (`sku: null`).
 */
export function exactMatch(
  query: string,
  product: { slug: string; name: string; modelNumber: string; skus: string[] },
): { sku: string | null } | null {
  const q = normalizeQuery(query);
  if (!q) return null;
  const sku = product.skus.find((s) => normalizeQuery(s) === q);
  if (sku) return { sku };
  const name = normalizeQuery(product.name);
  const names = [
    name,
    name.startsWith(BRAND) ? name.slice(BRAND.length) : name,
    product.slug,
    normalizeQuery(product.modelNumber),
  ];
  return names.includes(q) ? { sku: null } : null;
}

/** Hits scoring below this share of the best hit are dropped (D-182, see `keepRelevant`). */
export const RELEVANCE_RATIO = 0.6;

/**
 * Drops weak typo matches once a strong match exists: "case" also scores 0.4 against "cable",
 * which is noise beside a 1.0 hit, but a lone 0.4 ("wach" → watch) is the best we have.
 * `hits` are sorted best first.
 */
export function keepRelevant<T extends { score: number }>(hits: T[]): T[] {
  const best = hits[0]?.score ?? 0;
  return hits.filter((h) => h.score >= best * RELEVANCE_RATIO);
}
