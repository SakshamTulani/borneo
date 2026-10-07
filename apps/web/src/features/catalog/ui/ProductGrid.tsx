import { ProductCard } from '@/shared/ui/commerce/ProductCard';
import { ProductCardSkeleton } from '@/shared/ui/commerce/ProductCardSkeleton';
import type { CatalogCard, CompareControl } from '../model';

const grid = 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4';

/** `eager`: how many leading cards are above the fold and load their photos first. */
export function ProductGrid({
  cards,
  eager = 0,
  compare,
}: {
  cards: CatalogCard[];
  eager?: number;
  /** Compare checkboxes under each card (D-122, D-227). */
  compare?: CompareControl | undefined;
}) {
  return (
    <ul className={grid}>
      {cards.map(({ id, slug, ...card }, i) => (
        <li key={id} className="flex flex-col gap-1.5">
          <ProductCard
            {...card}
            link={{ to: '/products/$slug', params: { slug } }}
            priority={i < eager}
            className="w-full flex-1"
          />
          {compare ? (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-full px-2 text-sm text-ink-muted hover:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
              <input
                type="checkbox"
                className="size-4 accent-[var(--brand)]"
                checked={compare.selected.includes(slug)}
                onChange={() => compare.onToggle(slug)}
                aria-label={`Compare ${card.name}`}
              />
              Compare
            </label>
          ) : null}
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
