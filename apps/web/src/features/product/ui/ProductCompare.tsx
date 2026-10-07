import { Link } from '@tanstack/react-router';
import { ScaleIcon } from 'lucide-react';
import type { ProductDetail } from '@borneo/shared';

const RELATION = { previous: 'Previous model', newer: 'Newer model', sibling: 'Same generation' };

/**
 * Compare from the product page (D-122, D-238): one tap against the previous model, the newer one
 * and same-generation siblings; or pick others in the category with this one already chosen.
 */
export function ProductCompare({ product }: { product: ProductDetail }) {
  const link =
    'flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand';
  return (
    <section aria-labelledby="pdp-compare" className="space-y-2 rounded-xl bg-surface p-5">
      <h2 id="pdp-compare" className="flex items-center gap-2 font-semibold">
        <ScaleIcon className="size-4 text-brand" aria-hidden />
        Compare
      </h2>
      <ul className="-mx-3">
        {product.compareWith.map((c) => (
          <li key={c.slug}>
            <Link
              to="/compare/$category"
              params={{ category: product.category.slug }}
              search={{ p: `${product.slug},${c.slug}` }}
              className={link}
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">
                  {product.name} vs {c.name}
                </span>
                <span className="block text-sm text-ink-muted">
                  {RELATION[c.relation]}
                  {c.discontinued ? ' · no longer sold' : ''}
                </span>
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/categories/$slug"
            params={{ slug: product.category.slug }}
            search={{ compare: product.slug }}
            className={`${link} text-brand`}
          >
            Compare with other {product.category.name.toLowerCase()}
          </Link>
        </li>
      </ul>
    </section>
  );
}
