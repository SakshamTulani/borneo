import { ProductCard } from '@/shared/ui/commerce/ProductCard';
import { ProductCardSkeleton } from '@/shared/ui/commerce/ProductCardSkeleton';
import type { CatalogCard } from '../model';

const grid = 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4';

export function ProductGrid({ cards }: { cards: CatalogCard[] }) {
  return (
    <ul className={grid}>
      {cards.map(({ id, slug, ...card }) => (
        <li key={id} className="flex">
          <ProductCard
            {...card}
            link={{ to: '/products/$slug', params: { slug } }}
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
