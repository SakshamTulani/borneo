import { Link } from '@tanstack/react-router';
import { CheckCircle2Icon, FileTextIcon, TruckIcon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { formatDateRange } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Container } from '@/shared/ui/layout/Container';
import { useOrderQuery } from '../hooks/useOrderQuery';
import { noticeText, paidWith } from '../mappers/checkoutText';
import { invoiceHref } from '../repository/checkoutRepository';

const row = 'flex items-baseline justify-between gap-4';

/** The confirmation (D-102): what was ordered, when it should arrive, how it was paid, the invoice. */
export function OrderConfirmedPage({ orderId }: { orderId: string }) {
  const query = useOrderQuery(orderId);
  const order = query.data;
  if (query.isError && !order)
    return (
      <Container className="pt-6">
        <ErrorState title="Couldn't load your order" onRetry={() => void query.refetch()} />
      </Container>
    );
  if (!order)
    return (
      <Container className="pt-6">
        <Skeleton className="h-96 w-full" aria-label="Loading your order" />
      </Container>
    );
  const confirmed = order.status === 'confirmed';

  return (
    <Container className="max-w-2xl space-y-6 pt-6 pb-10">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 font-heading text-title tracking-tight">
          {confirmed ? <CheckCircle2Icon className="size-7 text-success" aria-hidden /> : null}
          {confirmed ? 'Thank you, your order is confirmed' : `Order ${order.number}`}
        </h1>
        <p className="text-ink-muted">
          Order {order.number} · {paidWith(order)}
        </p>
      </div>
      {order.notice === 'CONFIRMED_AFTER_EXPIRY' ? (
        <p role="status" className="rounded-xl bg-brand-soft p-4 text-sm">
          {noticeText(order)}
        </p>
      ) : null}

      {order.eta ? (
        <p className="flex items-center gap-2 rounded-xl bg-surface p-4">
          <TruckIcon className="size-5 shrink-0 text-success" aria-hidden />
          <span>
            Estimated delivery <strong>{formatDateRange(order.eta.from, order.eta.to)}</strong> to{' '}
            {order.address.name}, {order.address.city} {order.address.pincode}.
          </span>
        </p>
      ) : null}

      <section aria-labelledby="order-items" className="space-y-3 rounded-xl bg-surface p-5">
        <h2 id="order-items" className="text-lg font-semibold">
          Items
        </h2>
        <ul className="divide-y divide-line">
          {order.items.map((i, n) => (
            <li key={`${i.sku}-${n}`} className="flex justify-between gap-4 py-2.5">
              <span className="min-w-0">
                <span className="block font-semibold">
                  {i.name} <span className="font-normal text-ink-muted">× {i.qty}</span>
                </span>
                <span className="block text-sm text-ink-muted">
                  {[
                    i.bundleName ? `In ${i.bundleName}` : null,
                    i.isFlash ? 'Flash sale price' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatInr(i.unitPricePaise * i.qty - i.discountPaise)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-line pt-3">
          <div className={row}>
            <dt>Items</dt>
            <dd className="tabular-nums">{formatInr(order.subtotalPaise)}</dd>
          </div>
          {order.couponDiscountPaise ? (
            <div className={cn(row, 'text-offer')}>
              <dt>Coupon {order.couponCode}</dt>
              <dd className="tabular-nums">−{formatInr(order.couponDiscountPaise)}</dd>
            </div>
          ) : null}
          {order.paymentDiscountPaise ? (
            <div className={cn(row, 'text-offer')}>
              <dt>{order.paymentOfferName ?? 'Payment offer'}</dt>
              <dd className="tabular-nums">−{formatInr(order.paymentDiscountPaise)}</dd>
            </div>
          ) : null}
          <div className={row}>
            <dt>Delivery</dt>
            <dd>Free</dd>
          </div>
          <div className={cn(row, 'text-lg font-semibold')}>
            <dt>Total</dt>
            <dd className="tabular-nums">{formatInr(order.totalPaise)}</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        {order.invoiceNumber ? (
          <a
            href={invoiceHref(order.id)}
            download
            className={buttonVariants({ variant: 'outline' })}
          >
            <FileTextIcon aria-hidden />
            Download invoice {order.invoiceNumber}
          </a>
        ) : order.isPreorder ? (
          <p className="text-sm text-ink-muted">Your invoice is issued when the order ships.</p>
        ) : null}
        <Link to="/" className={buttonVariants()}>
          Continue shopping
        </Link>
      </div>
      <p className="text-sm text-ink-muted">
        A confirmation is in your{' '}
        <Link to="/account/inbox" className="text-brand hover:underline">
          account inbox
        </Link>
        . The courier will text you when it ships.
      </p>
    </Container>
  );
}
