import { useId, useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { BanknoteIcon, CheckIcon, CreditCardIcon, MapPinIcon, TicketIcon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { formatDay } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { Input } from '@/shared/ui/base/input';
import { Label } from '@/shared/ui/base/label';
import { codText } from '../mappers/cartText';
import type { CartView } from '../model';

type Props = {
  cart: CartView;
  signedIn: boolean;
  pincodeInput: string;
  onPincodeInput: (value: string) => void;
  onPincodeSubmit: () => void;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
  couponError: string | null;
  couponBusy: boolean;
};

const row = 'flex items-baseline justify-between gap-4';
const until = (ms: number) => `Until ${formatDay(new Date(ms).toISOString())}`;

/**
 * Totals and offers (D-35, D-195, D-196): the selling-price total, the customer's coupon, other
 * coupons to apply by choice, payment offers as what they'd save at payment (none selected), EMI,
 * and delivery and COD at a pincode (D-55).
 */
export function CartSummary(props: Props) {
  const { cart, signedIn } = props;
  const [code, setCode] = useState('');
  const pinId = useId();
  const codeId = useId();
  const codeErrorId = useId();

  const submitPincode = (e: FormEvent) => {
    e.preventDefault();
    props.onPincodeSubmit();
  };
  const submitCoupon = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) props.onApplyCoupon(code.trim());
  };

  return (
    <div className="space-y-5">
      <section aria-labelledby="cart-delivery" className="space-y-2 rounded-xl bg-surface p-5">
        <h2 id="cart-delivery" className="flex items-center gap-2 font-semibold">
          <MapPinIcon className="size-4" aria-hidden />
          Delivery
        </h2>
        <form onSubmit={submitPincode} className="flex gap-2">
          <Label htmlFor={pinId} className="sr-only">
            Delivery pincode
          </Label>
          <Input
            id={pinId}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="Pincode"
            value={props.pincodeInput}
            onChange={(e) => props.onPincodeInput(e.target.value)}
            className="max-w-40"
          />
          <Button type="submit" variant="outline">
            Check
          </Button>
        </form>
        {cart.delivery ? (
          <div className="space-y-1 text-sm">
            <p>
              Delivering to {cart.delivery.pincode}
              {cart.delivery.place ? `, ${cart.delivery.place.city}` : ''}. Dates for each item are
              shown with it.
            </p>
            <p
              className={cn(
                'flex items-center gap-1.5',
                cart.delivery.cod.allowed ? 'text-success' : 'text-ink-muted',
              )}
            >
              <BanknoteIcon className="size-4 shrink-0" aria-hidden />
              {codText(cart.delivery.cod)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Enter a pincode to see delivery dates and cash on delivery.
          </p>
        )}
      </section>

      <section aria-labelledby="cart-coupon" className="space-y-3 rounded-xl bg-surface p-5">
        <h2 id="cart-coupon" className="flex items-center gap-2 font-semibold">
          <TicketIcon className="size-4" aria-hidden />
          Coupon
        </h2>
        {cart.coupon ? (
          <div className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p>
                <code className="rounded-sm border border-line bg-canvas px-2 py-0.5 font-mono font-semibold">
                  {cart.coupon.code}
                </code>{' '}
                {cart.coupon.status === 'applied' ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckIcon className="size-4" aria-hidden />
                    Applied: {cart.coupon.name}
                  </span>
                ) : (
                  <span className="text-ink-muted">Not applied</span>
                )}
              </p>
              {cart.coupon.status === 'notApplied' ? (
                <p className="mt-1 text-ink-muted">{cart.coupon.reason}</p>
              ) : null}
            </div>
            <Button variant="ghost" onClick={props.onRemoveCoupon} disabled={props.couponBusy}>
              Remove
            </Button>
          </div>
        ) : (
          <form onSubmit={submitCoupon} className="space-y-1">
            <Label htmlFor={codeId}>Coupon code</Label>
            <div className="flex gap-2">
              <Input
                id={codeId}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoCapitalize="characters"
                aria-invalid={props.couponError ? true : undefined}
                aria-describedby={props.couponError ? codeErrorId : undefined}
              />
              <Button type="submit" variant="outline" loading={props.couponBusy}>
                Apply
              </Button>
            </div>
            {props.couponError ? (
              <p id={codeErrorId} role="alert" className="text-sm text-danger">
                {props.couponError}
              </p>
            ) : null}
          </form>
        )}
        {cart.coupons.length ? (
          <ul className="space-y-2" aria-label="Coupons you can use">
            {cart.coupons.map((c) => (
              <li
                key={c.code}
                className="flex items-start justify-between gap-3 border-t border-line pt-2 text-sm"
              >
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-ink-muted">
                    {c.savingPaise !== null
                      ? `Saves ${formatInr(c.savingPaise)} on this cart. `
                      : `${c.reason} `}
                    {until(c.validTo)}
                  </p>
                </div>
                {c.savingPaise !== null ? (
                  <Button
                    variant="outline"
                    onClick={() => props.onApplyCoupon(c.code)}
                    disabled={props.couponBusy}
                    aria-label={`Apply coupon ${c.code}`}
                  >
                    {cart.coupon?.status === 'applied' ? 'Use instead' : 'Apply'}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="cart-total" className="space-y-3 rounded-xl bg-surface p-5">
        <h2 id="cart-total" className="font-semibold">
          Order summary
        </h2>
        <dl className="space-y-1.5">
          <div className={row}>
            <dt>Items ({cart.count})</dt>
            <dd className="tabular-nums">{formatInr(cart.subtotalPaise)}</dd>
          </div>
          {cart.coupon?.status === 'applied' ? (
            <div className={cn(row, 'text-offer')}>
              <dt>Coupon {cart.coupon.code}</dt>
              <dd className="tabular-nums">−{formatInr(cart.coupon.discountPaise)}</dd>
            </div>
          ) : null}
          <div className={cn(row, 'border-t border-line pt-2 text-lg font-semibold')}>
            <dt>Total</dt>
            <dd className="tabular-nums">{formatInr(cart.totalPaise)}</dd>
          </div>
        </dl>
        <p className="text-xs text-ink-muted">Prices include GST.</p>
        {cart.emiFromPaise ? (
          <p className="text-sm text-ink-muted">
            EMI from <span className="tabular-nums">{formatInr(cart.emiFromPaise)}</span>/mo
          </p>
        ) : null}

        {signedIn ? (
          <div className="space-y-1">
            <Button size="lg" className="w-full" disabled>
              Checkout
            </Button>
            <p className="text-sm text-ink-muted">
              {cart.canCheckout
                ? 'Checkout arrives in the next update of this demo.'
                : 'Fix the items marked above to continue.'}
            </p>
          </div>
        ) : (
          <Link
            to="/sign-in"
            search={{ redirect: '/cart' }}
            className={buttonVariants({ size: 'lg', className: 'w-full' })}
          >
            Sign in to check out
          </Link>
        )}
      </section>

      {cart.paymentOffers.length ? (
        <section
          aria-labelledby="cart-payment-offers"
          className="space-y-2 rounded-xl bg-surface p-5"
        >
          <h2 id="cart-payment-offers" className="flex items-center gap-2 font-semibold">
            <CreditCardIcon className="size-4" aria-hidden />
            Payment offers
          </h2>
          <p className="text-sm text-ink-muted">
            Choose one when you pay. They're not in the total above until then.
          </p>
          <ul className="space-y-2">
            {cart.paymentOffers.map((o) => (
              <li key={o.id} className="border-t border-line pt-2 text-sm">
                <p className="font-semibold">{o.name}</p>
                <p className={o.savingPaise !== null ? 'text-offer' : 'text-ink-muted'}>
                  {o.savingPaise !== null
                    ? o.kind === 'noCostEmi'
                      ? `No interest to pay: ${formatInr(o.savingPaise)} off upfront`
                      : `Saves ${formatInr(o.savingPaise)} on this cart`
                    : o.reason}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
