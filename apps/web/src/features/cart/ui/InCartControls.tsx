import { Link } from '@tanstack/react-router';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/shared/lib/errors';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/base/button';
import { QuantityStepper } from '@/shared/ui/commerce/QuantityStepper';
import { useRemoveCartLineMutation } from '../hooks/useRemoveCartLineMutation';
import { useUpdateCartLineMutation } from '../hooks/useUpdateCartLineMutation';
import type { CartLineView } from '../model';

type Props = {
  line: CartLineView;
  /** `compact`: the stepper alone (mobile purchase bar). */
  compact?: boolean;
  className?: string;
};

/**
 * Shown instead of "Add to cart" once the line is in the cart: how many, change it (up to the
 * line limit or what we can supply, D-193), remove it, go to the cart.
 */
export function InCartControls({ line, compact = false, className }: Props) {
  const setQty = useUpdateCartLineMutation();
  const remove = useRemoveCartLineMutation();
  const [error, setError] = useState<string | null>(null);
  const busy = setQty.isPending || remove.isPending;
  const failed = (e: unknown) => setError(errorMessage(e));

  const stepper = (
    <QuantityStepper
      value={line.qty}
      max={line.maxQty}
      label={line.name}
      disabled={busy}
      onChange={(qty) => {
        setError(null);
        setQty.mutate({ key: line.key, qty, pincode: null }, { onError: failed });
      }}
    />
  );
  if (compact) return stepper;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-success" role="status">
        <CheckIcon className="size-4" aria-hidden />
        In your cart
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {stepper}
        <Button
          variant="ghost"
          disabled={busy}
          aria-label={`Remove ${line.name} from cart`}
          onClick={() => {
            setError(null);
            remove.mutate({ key: line.key, pincode: null }, { onError: failed });
          }}
        >
          Remove
        </Button>
        <Link
          to="/cart"
          className="ml-auto inline-flex min-h-11 items-center px-1 text-brand underline underline-offset-4"
        >
          View cart
        </Link>
      </div>
      {line.qty >= line.maxQty ? (
        <p className="text-sm text-ink-muted">That's the most you can add of this.</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
