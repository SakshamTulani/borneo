import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertCircleIcon, ShoppingBagIcon, TruckIcon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { useAddressesQuery } from '@/features/addresses';
import { useSessionQuery } from '@/features/auth';
import { errorCode, errorMessage } from '@/shared/lib/errors';
import { formatDateRange } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { Select } from '@/shared/ui/base/select';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { Container } from '@/shared/ui/layout/Container';
import { useCheckoutQuery } from '../hooks/useCheckoutQuery';
import { usePlaceOrderMutation } from '../hooks/usePlaceOrderMutation';
import {
  METHOD_LABELS,
  blockText,
  codReasonText,
  emiPlanText,
  offerSavingText,
} from '../mappers/checkoutText';
import { newIdempotencyKey } from '../repository/checkoutRepository';
import type { CheckoutChoice, CheckoutView, OrderView, PaymentMethod } from '../model';
import { CheckoutSignUp } from './CheckoutSignUp';
import { ChoiceList } from '@/shared/ui/forms/ChoiceList';

type Props = {
  choice: CheckoutChoice;
  /** Merges into the URL; any change rechecks stock, delivery and COD (D-55). */
  onChoice: (next: Partial<CheckoutChoice>) => void;
  onPlaced: (order: OrderView) => void;
};

const NO_OFFER = 'none';
const section = 'space-y-4 rounded-xl bg-surface p-5';
const row = 'flex items-baseline justify-between gap-4';

/**
 * Checkout (D-55, D-70–D-73, D-90, D-92, D-201, D-202). Signed out, the account is made here.
 * The customer picks the address, how to pay and, if they want, one payment offer; nothing is
 * chosen for them (D-06) and nothing is cross-sold here (D-73).
 */
export function CheckoutPage(props: Props) {
  const session = useSessionQuery();
  if (session.isPending) return <Loading />;
  return (
    <Container className="space-y-6 pt-6 pb-10">
      <h1 className="font-heading text-title tracking-tight">Checkout</h1>
      {session.data ? <SignedInCheckout {...props} /> : <CheckoutSignUp />}
    </Container>
  );
}

function Loading() {
  return (
    <Container className="space-y-3 pt-6" aria-busy="true" aria-label="Loading checkout">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </Container>
  );
}

function SignedInCheckout({ choice, onChoice, onPlaced }: Props) {
  const addresses = useAddressesQuery();
  const query = useCheckoutQuery(choice);
  const place = usePlaceOrderMutation();
  const key = useRef<string | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);

  if (query.isError && !query.data)
    return <ErrorState title="Couldn't load checkout" onRetry={() => void query.refetch()} />;
  if (!query.data || addresses.isPending) return <Skeleton className="h-96 w-full" />;
  const view = query.data;
  if (view.cart.lines.length === 0)
    return (
      <EmptyState
        icon={<ShoppingBagIcon className="size-9" strokeWidth={1.5} />}
        title="Your cart is empty"
        body="Add something to your cart to check out."
        action={
          <Link to="/categories" className={buttonVariants()}>
            Browse categories
          </Link>
        }
      />
    );

  const submit = () => {
    if (!view.addressId || !choice.method) return;
    key.current ??= newIdempotencyKey();
    place.mutate(
      {
        key: key.current,
        request: {
          addressId: view.addressId,
          payment: {
            method: choice.method,
            ...(choice.bank ? { bank: choice.bank } : {}),
            ...(choice.tenureMonths ? { tenureMonths: choice.tenureMonths } : {}),
          },
          ...(choice.paymentOfferId ? { paymentOfferId: choice.paymentOfferId } : {}),
          expectedTotalPaise: view.totals.totalPaise,
        },
      },
      {
        onSuccess: (order) => onPlaced(order),
        onError: (e) => {
          // A 4xx answer means nothing was placed: the next try may use a new key. On a 5xx or a
          // lost answer the order may stand, so a retry keeps the key and gets that order back.
          const status = (e as { status?: number }).status;
          if (status !== undefined && status >= 400 && status < 500) key.current = null;
          const details = (e as { details?: { totalPaise?: number } }).details;
          if (errorCode(e) === 'PRICE_CHANGED' && details?.totalPaise !== undefined)
            setFresh(details.totalPaise);
          void query.refetch();
        },
      },
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-10">
      <div className="space-y-6">
        <section aria-labelledby="checkout-address" className={section}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="checkout-address" className="text-lg font-semibold">
              Delivery address
            </h2>
            <Link
              to="/account/addresses/new"
              search={{ next: 'checkout' }}
              className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
            >
              Add an address
            </Link>
          </div>
          {addresses.data?.length ? (
            <ChoiceList
              label="Delivery address"
              value={view.addressId ?? undefined}
              onChange={(addressId) => onChoice({ addressId })}
              choices={addresses.data.map((a) => ({
                value: a.id,
                title: `${a.name}${a.isDefault ? ' (default)' : ''}`,
                detail: `${a.line1}, ${a.city} ${a.pincode} · ${a.phone}`,
              }))}
            />
          ) : (
            <p className="text-ink-muted">Add a delivery address to continue.</p>
          )}
        </section>

        <ItemsSection view={view} />
        <PaymentSection view={view} choice={choice} onChoice={onChoice} />
      </div>

      <div className="lg:sticky lg:top-32">
        <Summary
          view={view}
          choice={choice}
          placing={place.isPending}
          error={place.error}
          fresh={fresh}
          onPlace={submit}
        />
      </div>
    </div>
  );
}

function ItemsSection({ view }: { view: CheckoutView }) {
  return (
    <section aria-labelledby="checkout-items" className={section}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="checkout-items" className="text-lg font-semibold">
          Items ({view.cart.count})
        </h2>
        <Link
          to="/cart"
          className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          Edit cart
        </Link>
      </div>
      <ul className="divide-y divide-line">
        {view.cart.lines.map((l) => {
          const d = l.delivery;
          return (
            <li key={l.key} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold">
                  {l.name} <span className="font-normal text-ink-muted">× {l.qty}</span>
                </p>
                {l.flash ? (
                  <p className="text-sm text-offer">
                    1 at the flash price {formatInr(l.flash.unitPricePaise)}
                  </p>
                ) : null}
                {l.status !== 'ok' ? (
                  <p className="text-sm text-danger">This item needs attention in your cart.</p>
                ) : d ? (
                  <p
                    className={cn(
                      'flex items-center gap-1.5 text-sm',
                      d.status === 'deliverable' ? 'text-success' : 'text-danger',
                    )}
                  >
                    <TruckIcon className="size-4 shrink-0" aria-hidden />
                    {d.status === 'deliverable'
                      ? `Delivery ${formatDateRange(d.from, d.to)}`
                      : d.status === 'outOfStockHere'
                        ? 'Not in stock for this address'
                        : "We don't deliver this to this address"}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 tabular-nums">{formatInr(l.linePaise)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PaymentSection({
  view,
  choice,
  onChoice,
}: {
  view: CheckoutView;
  choice: CheckoutChoice;
  onChoice: Props['onChoice'];
}) {
  const changeMethod = (method: PaymentMethod) =>
    onChoice({
      method,
      bank: undefined,
      tenureMonths: undefined,
      // COD never takes a payment offer (D-35).
      ...(method === 'cod' ? { paymentOfferId: undefined } : {}),
    });
  const planValue =
    choice.bank && choice.tenureMonths ? `${choice.bank}|${choice.tenureMonths}` : undefined;
  return (
    <section aria-labelledby="checkout-payment" className={section}>
      <h2 id="checkout-payment" className="text-lg font-semibold">
        Payment
      </h2>
      <ChoiceList
        label="Payment method"
        value={choice.method}
        onChange={(m) => changeMethod(m as PaymentMethod)}
        choices={view.methods.map((m) => ({
          value: m.method,
          title: METHOD_LABELS[m.method],
          disabled: !m.allowed,
          detail: !m.allowed
            ? codReasonText(m.reasons)
            : m.method === 'cod'
              ? 'Pay the courier in cash or by UPI when it arrives.'
              : m.method === 'emi'
                ? view.emiPlans.length
                  ? 'Monthly instalments on a credit card.'
                  : 'Not available for this order total.'
                : null,
        }))}
      />

      {choice.method === 'card' && view.banks.length ? (
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Card issued by</span>
          <Select
            value={choice.bank ?? ''}
            onChange={(e) => onChoice({ bank: e.target.value || undefined })}
          >
            <option value="">Another bank</option>
            {view.banks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <span className="block text-ink-muted">Bank offers need a card from that bank.</span>
        </label>
      ) : null}

      {choice.method === 'emi' && view.emiPlans.length ? (
        <div className="space-y-2">
          <h3 className="font-semibold">EMI plan</h3>
          <ChoiceList
            label="EMI plan"
            value={planValue}
            onChange={(v) => {
              const [bank, months] = v.split('|');
              onChoice({ bank, tenureMonths: Number(months) });
            }}
            choices={view.emiPlans.map((p) => ({
              value: `${p.bank}|${p.tenureMonths}`,
              title: `${formatInr(p.monthlyPaise)}/mo for ${p.tenureMonths} months`,
              detail: `${emiPlanText(p)}${p.noCostOfferId ? ' · no-cost EMI offer available' : ''}`,
            }))}
          />
        </div>
      ) : null}

      {view.paymentOffers.length && choice.method !== 'cod' ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Payment offer</h3>
          <p className="text-sm text-ink-muted">
            One per order. Choose one if it fits how you pay.
          </p>
          <ChoiceList
            label="Payment offer"
            value={choice.paymentOfferId ?? NO_OFFER}
            onChange={(v) => onChoice({ paymentOfferId: v === NO_OFFER ? undefined : v })}
            choices={[
              { value: NO_OFFER, title: 'No payment offer' },
              ...view.paymentOffers.map((o) => ({
                value: o.id,
                title: o.name,
                detail: offerSavingText(o) ?? o.reason,
              })),
            ]}
          />
        </div>
      ) : null}
    </section>
  );
}

function Summary({
  view,
  choice,
  placing,
  error,
  fresh,
  onPlace,
}: {
  view: CheckoutView;
  choice: CheckoutChoice;
  placing: boolean;
  error: unknown;
  fresh: number | null;
  onPlace: () => void;
}) {
  const t = view.totals;
  const prepaid = choice.method && choice.method !== 'cod';
  return (
    <section aria-labelledby="checkout-summary" className={section}>
      <h2 id="checkout-summary" className="text-lg font-semibold">
        Order summary
      </h2>
      <dl className="space-y-1.5">
        <div className={row}>
          <dt>Items ({view.cart.count})</dt>
          <dd className="tabular-nums">{formatInr(t.subtotalPaise)}</dd>
        </div>
        {t.couponDiscountPaise ? (
          <div className={cn(row, 'text-offer')}>
            <dt>Coupon {view.cart.coupon?.code}</dt>
            <dd className="tabular-nums">−{formatInr(t.couponDiscountPaise)}</dd>
          </div>
        ) : null}
        {t.paymentDiscountPaise ? (
          <div className={cn(row, 'text-offer')}>
            <dt>Payment offer</dt>
            <dd className="tabular-nums">−{formatInr(t.paymentDiscountPaise)}</dd>
          </div>
        ) : null}
        <div className={row}>
          <dt>Delivery</dt>
          <dd>Free</dd>
        </div>
        <div className={cn(row, 'border-t border-line pt-2 text-lg font-semibold')}>
          <dt>Total</dt>
          <dd className="tabular-nums">{formatInr(t.totalPaise)}</dd>
        </div>
      </dl>
      <p className="text-xs text-ink-muted">Prices include GST.</p>
      {t.emiMonthlyPaise ? (
        <p className="text-sm">
          You pay <span className="tabular-nums">{formatInr(t.emiMonthlyPaise)}</span> a month for{' '}
          {choice.tenureMonths} months.
        </p>
      ) : null}
      {view.paymentOfferReason ? (
        <p className="text-sm text-danger">{view.paymentOfferReason}</p>
      ) : null}

      {fresh !== null && fresh === t.totalPaise ? (
        <FormAlert>
          The total changed to {formatInr(fresh)}. Check it and place the order again.
        </FormAlert>
      ) : error && errorCode(error) !== 'PRICE_CHANGED' ? (
        <FormAlert>{errorMessage(error)}</FormAlert>
      ) : null}

      {view.blocks.length ? (
        <ul className="space-y-1 text-sm" aria-label="Before you can place the order">
          {view.blocks.map((b) => (
            <li key={b} className="flex items-start gap-1.5 text-ink-muted">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {blockText(b)}
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        size="lg"
        className="w-full"
        disabled={!view.canPlace}
        loading={placing}
        onClick={onPlace}
      >
        {prepaid ? `Pay ${formatInr(t.totalPaise)}` : 'Place order'}
      </Button>
      {prepaid ? (
        <p className="text-xs text-ink-muted">
          We hold your items for 5 minutes while you pay. If payment doesn't finish, they go back to
          stock and nothing is charged.
        </p>
      ) : null}
    </section>
  );
}
