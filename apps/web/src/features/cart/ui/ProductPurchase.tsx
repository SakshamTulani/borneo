import { useState } from 'react';
import { itemKey, type Availability, type Paise } from '@borneo/shared';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/base/button';
import { StickyPurchaseBar } from '@/shared/ui/commerce/StickyPurchaseBar';
import { useAddToCartMutation } from '../hooks/useAddToCartMutation';
import { useCartQuery } from '../hooks/useCartQuery';
import type { CartAddResult } from '../model';
import { AddedToCartDialog } from './AddedToCartDialog';
import { InCartControls } from './InCartControls';

type Props = {
  productName: string;
  sku: string;
  availability: Availability;
  sellingPaise: Paise;
};

const label = (a: Availability) =>
  a === 'outOfStock' ? 'Out of stock' : a === 'preorder' ? 'Pre-order' : 'Add to cart';

/**
 * The PDP buy action (D-160): a full-width button in the buy box and, on mobile, the sticky
 * purchase bar. Anyone can add; buying needs an account later (D-90, D-192). Once the variant
 * is in the cart, both show its quantity with a stepper instead.
 */
export function ProductPurchase({ productName, sku, availability, sellingPaise }: Props) {
  const add = useAddToCartMutation();
  const [result, setResult] = useState<CartAddResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unavailable = availability === 'outOfStock';
  // Once this variant is in the cart, the buy box shows its quantity instead of "Add to cart".
  const line = useCartQuery().data?.lines.find((l) => l.key === itemKey(sku));

  const onAdd = () => {
    setError(null);
    add.mutate(
      { key: itemKey(sku), pincode: null },
      {
        onSuccess: setResult,
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  const button = (wide: boolean) => (
    <Button
      size={wide ? 'lg' : 'default'}
      className={wide ? 'w-full' : undefined}
      disabled={unavailable}
      loading={add.isPending}
      onClick={onAdd}
      aria-label={wide ? undefined : `${label(availability)}: ${productName}`}
    >
      {label(availability)}
    </Button>
  );

  return (
    <div className="space-y-2">
      {line ? <InCartControls line={line} /> : button(true)}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <StickyPurchaseBar
        name={productName}
        sellingPaise={sellingPaise}
        action={line ? <InCartControls line={line} compact /> : button(false)}
      />
      <AddedToCartDialog result={result} onClose={() => setResult(null)} />
    </div>
  );
}
