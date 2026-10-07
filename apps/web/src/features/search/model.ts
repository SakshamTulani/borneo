import type { CatalogCard } from '@/features/catalog';

export type SearchCategoryLink = { slug: string; name: string };

/** What the search UI renders for one query (D-110–114). */
export type SearchView = {
  query: string;
  /** Open this product instead of listing results (D-110). */
  exactMatch: { slug: string; variant?: string } | null;
  /** "Smartphones under ₹30,000" when the query named a category or a price (D-113). */
  interpretation?: {
    label: string;
    /** The category page with the same price cap, for the full filter set. */
    category?: { slug: string; name: string; maxPrice?: number };
  };
  categories: SearchCategoryLink[];
  cards: CatalogCard[];
  /** Relevant matches across all pages, and where the next page starts. */
  total: number;
  nextCursor: string | null;
  /** Only when nothing matched (D-114). */
  fallback: { cards: CatalogCard[]; categories: SearchCategoryLink[] } | null;
};

/** One row of the instant suggestions list (D-112). */
export type Suggestion =
  | { kind: 'category'; id: string; slug: string; name: string }
  | {
      kind: 'product';
      id: string;
      slug: string;
      name: string;
      image?: { src: string; alt: string; srcSet?: string };
      priceLabel: string;
      stockLabel: string;
    };
