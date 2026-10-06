import { ProductCard } from '@/shared/ui/commerce/ProductCard';
import { ProductCardSkeleton } from '@/shared/ui/commerce/ProductCardSkeleton';
import type { CatalogCard } from '../model';

const grid = 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4';

/** `eager`: how many leading cards are above the fold and load their photos first. */
export function ProductGrid({ cards, eager = 0 }: { cards: CatalogCard[]; eager?: number }) {
  return (
    <ul className={grid}>
      {cards.map(({ id, slug, ...card }, i) => (
        <li key={id} className="flex">
          <ProductCard
            {...card}
            link={{ to: '/products/$slug', params: { slug } }}
            priority={i < eager}
            className="w-full"
          />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className={grid} aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
