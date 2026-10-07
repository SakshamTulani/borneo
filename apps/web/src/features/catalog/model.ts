import type { FilterFacet, ProductSort } from '@borneo/shared';
import type { ProductCardProps } from '@/shared/ui/commerce/ProductCard';

/**
 * Category page state in the URL (D-18): sort, max price in whole rupees, and filters named by
 * attribute key ("8", "true" or comma-separated options).
 */
export type ListingSearch = {
  sort?: ProductSort | undefined;
  maxPrice?: number | undefined;
  [filterKey: string]: string | number | boolean | undefined;
};

export type CategoryLink = {
  slug: string;
  name: string;
  homeEntry?: 'helpMeChoose' | 'buildYourSetup';
  /** Guided finder id (D-225). */
  finder?: string;
};

/** A product card plus what the link needs. */
export type CatalogCard = Omit<ProductCardProps, 'link'> & { slug: string; id: string };

export type FilterControl =
  | {
      kind: 'anyOf';
      key: string;
      label: string;
      options: { value: string; label: string; checked: boolean }[];
    }
  | { kind: 'isTrue'; key: string; label: string; checked: boolean }
  | {
      kind: 'atLeast';
      key: string;
      label: string;
      value: string;
      options: { value: string; label: string }[];
    };

export type ActiveFilter = { key: string; label: string; remove: ListingSearch };

export type { FilterFacet };

/** The compare selection on a listing (D-122, D-227): slugs in the URL, at most 4. */
export type CompareControl = {
  selected: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
  /** Why the last add was refused, if it was. */
  message: string | null;
};
