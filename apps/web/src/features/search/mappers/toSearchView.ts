import { formatInr, type ProductSummary, type SearchResult } from '@borneo/shared';
import { toCatalogCard } from '@/features/catalog';
import { imageSource } from '@/shared/lib/image';
import type { SearchView, Suggestion } from '../model';

/** "Smartphones under ₹30,000", "Under ₹5,000" or "Smartphones" (D-113). */
export function interpretationLabel(i: SearchResult['interpretation']): string | undefined {
  const price = i.maxPricePaise !== undefined ? formatInr(i.maxPricePaise) : undefined;
  if (i.category) return price ? `${i.category.name} under ${price}` : i.category.name;
  return price ? `Under ${price}` : undefined;
}

export function toSearchView(r: SearchResult): SearchView {
  const label = interpretationLabel(r.interpretation);
  const { category, maxPricePaise } = r.interpretation;
  return {
    query: r.query,
    exactMatch: r.exactMatch
      ? { slug: r.exactMatch.slug, ...(r.exactMatch.sku ? { variant: r.exactMatch.sku } : {}) }
      : null,
    ...(label
      ? {
          interpretation: {
            label,
            ...(category
              ? {
                  category: {
                    slug: category.slug,
                    name: category.name,
                    // The category page takes whole rupees (D-18).
                    ...(maxPricePaise !== undefined
                      ? { maxPrice: Math.floor(maxPricePaise / 100) }
                      : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    categories: r.categories,
    cards: r.products.map(toCatalogCard),
    total: r.total,
    nextCursor: r.nextCursor,
    fallback: r.fallback
      ? { cards: r.fallback.alternatives.map(toCatalogCard), categories: r.fallback.categories }
      : null,
  };
}

const STOCK_LABEL: Record<ProductSummary['availability'], string> = {
  inStock: 'In stock',
  outOfStock: 'Out of stock',
  preorder: 'Pre-order',
};

/** Categories first, then products with price and stock (D-112). */
export function toSuggestions(r: SearchResult): Suggestion[] {
  return [
    ...r.categories.map((c): Suggestion => ({
      kind: 'category',
      id: `c-${c.slug}`,
      slug: c.slug,
      name: c.name,
    })),
    ...r.products.map((p): Suggestion => ({
      kind: 'product',
      id: `p-${p.slug}`,
      slug: p.slug,
      name: p.name,
      ...(p.image
        ? {
            image: {
              ...imageSource(p.image.src, { aspect: 1, widths: [96] }),
              alt: '',
            },
          }
        : {}),
      priceLabel: formatInr(p.price.sellingPaise),
      stockLabel: STOCK_LABEL[p.availability],
    })),
  ];
}
