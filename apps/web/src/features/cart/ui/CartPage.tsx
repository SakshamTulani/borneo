import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ShoppingBagIcon } from 'lucide-react';
import { isValidPincode } from '@borneo/shared';
import { useDefaultPincodeQuery } from '@/features/addresses';
import { useSessionQuery } from '@/features/auth';
import { useDeliveryForm } from '@/features/delivery';
import { errorMessage } from '@/shared/lib/errors';
import { buttonVariants } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Container } from '@/shared/ui/layout/Container';
import { useApplyCouponMutation } from '../hooks/useApplyCouponMutation';
import { useCartQuery } from '../hooks/useCartQuery';
import { useRemoveCartLineMutation } from '../hooks/useRemoveCartLineMutation';
import { useRemoveCouponMutation } from '../hooks/useRemoveCouponMutation';
import { useUpdateCartLineMutation } from '../hooks/useUpdateCartLineMutation';
import { CartLineItem } from './CartLineItem';
import { CartSummary } from './CartSummary';
import { SuggestionList } from './SuggestionList';

/**
 * The cart (D-192–D-199). Delivery and COD are for the default address's pincode, else the one
 * last checked in this browser, and update when the customer enters another (D-55, D-185).
 */
export function CartPage() {
  const signedIn = !!useSessionQuery().data;
  const form = useDeliveryForm(useDefaultPincodeQuery().data ?? null);
  const pincode = form.pincode && isValidPincode(form.pincode) ? form.pincode : null;
  const query = useCartQuery(pincode);
  const setQty = useUpdateCartLineMutation();
  const remove = useRemoveCartLineMutation();
  const applyCoupon = useApplyCouponMutation();
  const removeCoupon = useRemoveCouponMutation();
  const [lineError, setLineError] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const failed = (e: unknown) => setLineError(errorMessage(e));
  const busyKey = setQty.isPending
    ? setQty.variables?.key
    : remove.isPending
      ? remove.variables?.key
      : undefined;

  let body;
  if (query.isError && !query.data) {
    body = <ErrorState title="Couldn't load your cart" onRetry={() => void query.refetch()} />;
  } else if (!query.data) {
    body = (
      <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading your cart">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  } else if (query.data.lines.length === 0) {
    body = (
      <EmptyState
        icon={<ShoppingBagIcon className="size-9" strokeWidth={1.5} />}
        title="Your cart is empty"
        body="Find something you like and add it here."
        action={
          <Link to="/categories" className={buttonVariants()}>
            Browse categories
          </Link>
        }
      />
    );
  } else {
    const cart = query.data;
    body = (
      <div className="space-y-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-10">
          <section aria-label="Items" className="rounded-xl bg-surface px-5">
            {lineError ? (
              <p role="alert" className="pt-4 text-sm text-danger">
                {lineError}
              </p>
            ) : null}
            <ul className="divide-y divide-line">
              {cart.lines.map((line) => (
                <CartLineItem
                  key={line.key}
                  line={line}
                  busy={busyKey === line.key}
                  onQtyChange={(qty) => {
                    setLineError(null);
                    setQty.mutate({ key: line.key, qty, pincode }, { onError: failed });
                  }}
                  onRemove={() => {
                    setLineError(null);
                    remove.mutate({ key: line.key, pincode }, { onError: failed });
                  }}
                />
              ))}
            </ul>
          </section>
          <div className="lg:sticky lg:top-32">
            <CartSummary
              cart={cart}
              signedIn={signedIn}
              pincodeInput={form.input}
              onPincodeInput={form.setInput}
              onPincodeSubmit={() => void form.submit()}
              couponBusy={applyCoupon.isPending || removeCoupon.isPending}
              couponError={couponError}
              onApplyCoupon={(code) => {
                setCouponError(null);
                applyCoupon.mutate(
                  { code, pincode },
                  {
                    onError: (e) => setCouponError(errorMessage(e)),
                  },
                );
              }}
              onRemoveCoupon={() => removeCoupon.mutate({ pincode })}
            />
          </div>
        </div>
        {cart.suggestions.length ? (
          <section aria-labelledby="cart-suggestions" className="space-y-4">
            <h2 id="cart-suggestions" className="font-heading text-headline tracking-tight">
              Goes well with your cart
            </h2>
            <SuggestionList suggestions={cart.suggestions} pincode={pincode} />
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <Container className="space-y-6 pt-6 pb-10">
      <h1 className="font-heading text-title tracking-tight">Your cart</h1>
      {body}
    </Container>
  );
}
