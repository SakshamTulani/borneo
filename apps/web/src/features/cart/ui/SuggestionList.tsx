import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CheckIcon } from 'lucide-react';
import { toCatalogCard } from '@/features/catalog';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/base/button';
import { ProductCard } from '@/shared/ui/commerce/ProductCard';
import { useAddToCartMutation } from '../hooks/useAddToCartMutation';
import type { CartSuggestion } from '../model';

type Props = {
  suggestions: CartSuggestion[];
  /** Delivery in the refreshed cart is for this pincode (D-55). */
  pincode?: string | null;
  /** Cards side by side (cart page) or a compact list (add-to-cart dialog). */
  layout?: 'grid' | 'list';
};

/**
 * Cross-sell with a reason each (D-124, D-199). Nothing is added for the customer: each has its
 * own button, or a link to choose options when there is something to choose.
 */
export function SuggestionList({ suggestions, pincode = null, layout = 'grid' }: Props) {
  const add = useAddToCartMutation();
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState<string | null>(null);

  const onAdd = (key: string) => {
    setFailed(null);
    add.mutate(
      { key, pincode },
      {
        onSuccess: () => setAdded((s) => new Set(s).add(key)),
        onError: (e) => setFailed(errorMessage(e)),
      },
    );
  };

  return (
    <div className="space-y-3">
      <ul
        className={
          layout === 'grid'
            ? 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4'
            : 'grid grid-cols-2 gap-3 sm:grid-cols-3'
        }
      >
        {suggestions.map(({ product, reason, addKey }) => {
          const { id, slug, ...card } = toCatalogCard(product);
          return (
            <li key={id} className="flex flex-col gap-2">
              <ProductCard
                {...card}
                link={{ to: '/products/$slug', params: { slug } }}
                className="flex-1"
              />
              <p className="px-1 text-sm text-ink-muted">{reason}</p>
              {addKey ? (
                added.has(addKey) ? (
                  <p className="flex min-h-11 items-center gap-1 px-1 text-sm text-success">
                    <CheckIcon className="size-4" aria-hidden />
                    Added
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => onAdd(addKey)}
                    loading={add.isPending && add.variables?.key === addKey}
                    aria-label={`Add ${product.name} to cart`}
                  >
                    Add
                  </Button>
                )
              ) : (
                <Link
                  to="/products/$slug"
                  params={{ slug }}
                  className="inline-flex min-h-11 items-center px-1 text-sm text-brand underline underline-offset-4"
                  aria-label={`Choose options for ${product.name}`}
                >
                  Choose options
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {failed}
        </p>
      ) : null}
    </div>
  );
}
