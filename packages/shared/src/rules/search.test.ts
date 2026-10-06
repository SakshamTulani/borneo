import { describe, expect, it } from 'vitest';
import {
  exactMatch,
  keepRelevant,
  expandSynonyms,
  namedCategory,
  normalizeQuery,
  parsePriceIntent,
  searchIntent,
  type SynonymGroup,
} from './search';

const groups: SynonymGroup[] = [
  { term: 'earbuds', synonyms: ['earphones', 'tws', 'buds'] },
  { term: 'smartphone', synonyms: ['phone', 'mobile', 'fone'] },
  { term: 'case', synonyms: ['cover', 'back cover', 'phone cover'] },
  { term: 'robot vacuum', synonyms: ['jhadu pocha'] },
];

const pulse4 = {
  slug: 'pulse-4',
  name: 'Borneo Pulse 4',
  modelNumber: 'BP4-2025',
  skus: ['BP4-6-128-FOR', 'BP4-8-256-GRA'],
};

describe('search rules', () => {
  it('normalises case, punctuation and spacing but keeps model punctuation', () => {
    expect(normalizeQuery('  Pulse   4 Pro!! ')).toBe('pulse 4 pro');
    expect(normalizeQuery('BP4-6-128-FOR')).toBe('bp4-6-128-for');
    expect(normalizeQuery('- usb-c, 1.5m -')).toBe('usb-c 1.5m');
    expect(normalizeQuery('Ｐｕｌｓｅ')).toBe('pulse');
  });

  it('D-113: reads "under 30000" style price intent and strips it from the text', () => {
    expect(parsePriceIntent('phone under 30000')).toEqual({
      text: 'phone',
      maxPricePaise: 3_000_000,
    });
    expect(parsePriceIntent('earbuds below ₹2,999')).toEqual({
      text: 'earbuds',
      maxPricePaise: 299_900,
    });
    expect(parsePriceIntent('tv upto 1.5 lakh')).toEqual({ text: 'tv', maxPricePaise: 15_000_000 });
    expect(parsePriceIntent('phone under 30k')).toEqual({
      text: 'phone',
      maxPricePaise: 3_000_000,
    });
    expect(parsePriceIntent('< 20000 speaker')).toEqual({
      text: 'speaker',
      maxPricePaise: 2_000_000,
    });
  });

  it('D-113: Hinglish price phrases ("30000 ke andar", "20k tak")', () => {
    expect(parsePriceIntent('phone 30000 ke andar')).toEqual({
      text: 'phone',
      maxPricePaise: 3_000_000,
    });
    expect(parsePriceIntent('watch 20k tak')).toEqual({ text: 'watch', maxPricePaise: 2_000_000 });
  });

  it('D-113: numbers that are not a price stay in the text', () => {
    expect(parsePriceIntent('pulse 4')).toEqual({ text: 'pulse 4' });
    expect(parsePriceIntent('charger 67w')).toEqual({ text: 'charger 67w' });
    expect(parsePriceIntent('under 0')).toEqual({ text: 'under 0' });
  });

  it('D-111: synonyms rewrite to their term, keeping the literal query first', () => {
    expect(expandSynonyms('tws', groups)).toEqual(['tws', 'earbuds']);
    expect(expandSynonyms('jhadu pocha', groups)).toEqual(['jhadu pocha', 'robot vacuum']);
    expect(expandSynonyms('pulse 4', groups)).toEqual(['pulse 4']);
  });

  it('D-111: the longest synonym wins and words inside other words do not match', () => {
    expect(expandSynonyms('phone cover', groups)).toEqual(['phone cover', 'case']);
    expect(expandSynonyms('headphones', groups)).toEqual(['headphones']);
  });

  it('D-111: plural forms of a synonym match too', () => {
    expect(expandSynonyms('phones', groups)).toEqual(['phones', 'smartphone']);
  });

  it('D-113: a term that is a category name (or its plural) names that category', () => {
    const cats = [
      { slug: 'smartphones', name: 'Smartphones' },
      { slug: 'tvs', name: 'TVs' },
      { slug: 'robot-vacuums', name: 'Robot vacuums' },
      { slug: 'accessories', name: 'Accessories' },
    ];
    expect(namedCategory(['phone', 'smartphone'], cats)?.slug).toBe('smartphones');
    expect(namedCategory(['tv'], cats)?.slug).toBe('tvs');
    expect(namedCategory(['robot vacuum'], cats)?.slug).toBe('robot-vacuums');
    expect(namedCategory(['phone case', 'smartphone case'], cats)).toBeUndefined();
    expect(namedCategory([], cats)).toBeUndefined();
  });

  it('D-111, D-113: intent combines price, text and synonym terms', () => {
    expect(searchIntent('Mobile under 20,000', groups)).toEqual({
      text: 'mobile',
      maxPricePaise: 2_000_000,
      terms: ['mobile', 'smartphone'],
    });
    expect(searchIntent('under 5000', groups)).toEqual({
      text: '',
      maxPricePaise: 500_000,
      terms: [],
    });
  });

  it('D-110: exact model name, model number or slug opens the product', () => {
    for (const q of ['Borneo Pulse 4', 'pulse 4', 'PULSE-4', 'bp4-2025']) {
      expect(exactMatch(q, pulse4), q).toEqual({ sku: null });
    }
  });

  it('D-110: an exact SKU opens that variant', () => {
    expect(exactMatch('bp4-8-256-gra', pulse4)).toEqual({ sku: 'BP4-8-256-GRA' });
  });

  it('D-110: partial or near matches are not exact', () => {
    for (const q of ['pulse', 'pulse 4 pro', 'bp4', '']) {
      expect(exactMatch(q, pulse4), q).toBeNull();
    }
  });

  it('D-182: weak typo matches drop out beside a strong match, not on their own', () => {
    const hit = (slug: string, score: number) => ({ slug, score });
    expect(keepRelevant([hit('case', 1), hit('cable', 0.4)]).map((h) => h.slug)).toEqual(['case']);
    expect(keepRelevant([hit('watch', 0.4), hit('band', 0.4)])).toHaveLength(2);
    expect(keepRelevant([])).toEqual([]);
  });
});
