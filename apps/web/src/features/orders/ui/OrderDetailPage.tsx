import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  FileTextIcon,
  MapPinIcon,
  PackageIcon,
  RotateCcwIcon,
  StarIcon,
  TruckIcon,
} from 'lucide-react';
import {
  cancelOutcome,
  formatInr,
  linePaidPaise,
  orderNoticeText,
  policySummary,
} from '@borneo/shared';
import { errorMessage } from '@/shared/lib/errors';
import { formatDateRange, formatDateTime, formatDay } from '@/shared/lib/format';
import { imageSource } from '@/shared/lib/image';
import { cn } from '@/shared/lib/utils';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/base/dialog';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { OrderTimeline } from '@/shared/ui/commerce/OrderTimeline';
import { DemoBox } from '@/shared/ui/feedback/DemoBox';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { useAdvanceOrderMutation } from '../hooks/useAdvanceOrderMutation';
import { useAdvanceReturnMutation } from '../hooks/useAdvanceReturnMutation';
import { useCancelOrderMutation } from '../hooks/useCancelOrderMutation';
import { useOrderDetailQuery } from '../hooks/useOrderDetailQuery';
import { kindLabel, reasonLabel, RETURN_STATUS_LABELS, stepLabel } from '../mappers/orderText';
import type { OrderItem, OrderView } from '../model';
import { invoiceHref } from '../repository/ordersRepository';
import { OrderStatusBadge } from './OrderStatusBadge';
import { ReturnRequestDialog } from './ReturnRequestDialog';

const iso = (ms: number) => new Date(ms).toISOString();
const card = 'rounded-xl border border-line bg-surface p-5';
const row = 'flex items-baseline justify-between gap-4';

function CancelOrder({ order }: { order: OrderView }) {
  const [open, setOpen] = useState(false);
  const cancel = useCancelOrderMutation();
  const outcome = cancelOutcome({
    status: order.status,
    prepaid: order.payment.method !== 'cod',
    totalPaise: order.totalPaise,
  });
  const paid = outcome.ok && outcome.refundPaise > 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Cancel order</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Cancel order {order.number}?</DialogTitle>
        <DialogDescription>
          {paid
            ? `The whole order is cancelled and ${formatInr(order.totalPaise)} goes back to your original payment method.`
            : 'The whole order is cancelled. Nothing is charged.'}
        </DialogDescription>
        {cancel.isError ? <FormAlert>{errorMessage(cancel.error)}</FormAlert> : null}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="destructive"
            loading={cancel.isPending}
            onClick={() => cancel.mutate(order.id, { onSuccess: () => setOpen(false) })}
          >
            Yes, cancel it
          </Button>
          <DialogClose asChild>
            <Button variant="ghost">Keep the order</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReturnState({ item }: { item: OrderItem }) {
  const advance = useAdvanceReturnMutation();
  const r = item.returnRequest;
  if (!r) return null;
  return (
    <div className="space-y-2 rounded-lg bg-info-soft p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-info">
        <RotateCcwIcon className="size-4" aria-hidden />
        {kindLabel(r.kind)}: {RETURN_STATUS_LABELS[r.status]}
      </p>
      <p>
        {reasonLabel(r.reason)}
        {r.photoCount ? ` · ${r.photoCount} photo${r.photoCount > 1 ? 's' : ''}` : ''} · asked{' '}
        {formatDay(iso(r.createdAt))}
        {r.refundPaise ? ` · ${formatInr(r.refundPaise)} refunded` : ''}
      </p>
      {r.demoNextStatus ? (
        <Button
          variant="secondary"
          loading={advance.isPending}
          onClick={() => advance.mutate(r.id)}
        >
          Demo: mark {RETURN_STATUS_LABELS[r.demoNextStatus].split(':')[0]!.toLowerCase()}
        </Button>
      ) : null}
    </div>
  );
}

function ItemRow({ order, item }: { order: OrderView; item: OrderItem }) {
  const windowOpen =
    item.returnWindowEndsAt !== null && item.returnOptions.length > 0 && !item.returnRequest;
  return (
    <li className="flex gap-4 py-4">
      {item.image ? (
        <img
          {...imageSource(item.image.src, { aspect: 1, widths: [96, 192] })}
          sizes="80px"
          alt={item.image.alt}
          className="size-20 shrink-0 rounded-lg bg-muted object-cover"
        />
      ) : (
        <span className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted">
          <PackageIcon className="size-7 text-ink-muted" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex justify-between gap-4">
          <div className="min-w-0">
            {item.slug ? (
              <Link
                to="/products/$slug"
                params={{ slug: item.slug }}
                className="font-semibold hover:underline"
              >
                {item.name}
              </Link>
            ) : (
              <span className="font-semibold">{item.name}</span>
            )}
            <p className="text-sm text-ink-muted">
              {[
                ...Object.values(item.options),
                `Qty ${item.qty}`,
                item.bundleName ? `In ${item.bundleName}` : null,
                item.isFlash ? 'Flash sale price' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <span className="shrink-0 tabular-nums">{formatInr(linePaidPaise(item))}</span>
        </div>
        <ReturnState item={item} />
        {order.status === 'delivered' ? (
          <div className="flex flex-wrap items-center gap-3">
            {windowOpen ? <ReturnRequestDialog orderId={order.id} item={item} /> : null}
            {item.slug ? (
              <Link to="/account/reviews" className={buttonVariants({ variant: 'ghost' })}>
                <StarIcon aria-hidden />
                Review
              </Link>
            ) : null}
            {item.returnWindowEndsAt ? (
              <p className="text-sm text-ink-muted">
                {windowOpen || item.returnRequest
                  ? `Returns open until ${formatDay(iso(item.returnWindowEndsAt))}`
                  : 'Return window closed'}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** One order in the account (PRD post-purchase): tracking, items, returns, payment, invoice. */
export function OrderDetailPage({ orderId }: { orderId: string }) {
  const query = useOrderDetailQuery(orderId);
  const advance = useAdvanceOrderMutation();
  const order = query.data;
  if (query.isError && !order)
    return <ErrorState title="Couldn't load this order" onRetry={() => void query.refetch()} />;
  if (!order) return <Skeleton className="h-96 w-full" aria-label="Loading the order" />;

  const ended = order.status === 'cancelled' || order.status === 'refunded';
  const steps = order.tracking.steps
    .filter((s) => !ended || s.at !== null)
    .map((s) => ({
      label: stepLabel(s.step),
      status: s.state,
      ...(s.at ? { at: formatDateTime(iso(s.at)) } : {}),
    }));
  const refunded = order.refunds.reduce((sum, r) => sum + r.amountPaise, 0);

  return (
    <div className="space-y-5">
      <Link
        to="/account/orders"
        className="inline-flex min-h-11 items-center gap-1 text-[15px] text-brand hover:underline"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        All orders
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex flex-wrap items-center gap-3 font-heading text-tagline font-semibold">
            Order {order.number}
            <OrderStatusBadge status={order.status} />
          </h2>
          <p className="text-sm text-ink-muted">Placed {formatDateTime(iso(order.placedAt))}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {order.invoiceNumber ? (
            <a
              href={invoiceHref(order.id)}
              download
              className={buttonVariants({ variant: 'outline' })}
            >
              <FileTextIcon aria-hidden />
              Invoice
            </a>
          ) : null}
          {order.status === 'pending_payment' ? (
            <Link
              to="/checkout/$orderId/pay"
              params={{ orderId: order.id }}
              className={buttonVariants()}
            >
              Complete payment
            </Link>
          ) : null}
          {order.canCancel ? <CancelOrder order={order} /> : null}
        </div>
      </div>

      {order.notice && order.notice !== 'PAYMENT_FAILED' ? (
        <p role="status" className="rounded-xl bg-muted p-4 text-sm">
          {orderNoticeText(order.notice, order.totalPaise)}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section aria-labelledby="tracking" className={card}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 id="tracking" className="font-semibold">
                Tracking
              </h3>
              {order.preorderDispatch ? (
                <p className="flex items-center gap-1.5 text-sm">
                  <TruckIcon className="size-4 text-info" aria-hidden />
                  Pre-order: expected to dispatch{' '}
                  {formatDateRange(order.preorderDispatch.from, order.preorderDispatch.to)}
                </p>
              ) : order.status !== 'delivered' && !ended && order.eta ? (
                <p className="flex items-center gap-1.5 text-sm">
                  <TruckIcon className="size-4 text-success" aria-hidden />
                  Arrives {formatDateRange(order.eta.from, order.eta.to)}
                </p>
              ) : null}
            </div>
            <OrderTimeline
              steps={steps}
              {...(ended
                ? { outcome: { kind: 'cancelled' as const, label: 'Order cancelled' } }
                : {})}
            />
            {order.tracking.trackingNo ? (
              <p className="mt-4 text-sm text-ink-muted">
                {order.tracking.courier} · tracking number{' '}
                <span className="font-mono text-ink">{order.tracking.trackingNo}</span>. The courier
                texts you on the way.
              </p>
            ) : null}
            {order.demoNextStep ? (
              <div className="mt-4">
                <DemoBox title="Demo mode: no courier is connected">
                  <p className="mb-3">Move this order along as a courier would.</p>
                  {advance.isError ? <FormAlert>{errorMessage(advance.error)}</FormAlert> : null}
                  <Button
                    variant="secondary"
                    loading={advance.isPending}
                    onClick={() => advance.mutate(order.id)}
                  >
                    Advance to “{stepLabel(order.demoNextStep)}”
                  </Button>
                </DemoBox>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="items" className={card}>
            <h3 id="items" className="font-semibold">
              Items
            </h3>
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <ItemRow key={i.id} order={order} item={i} />
              ))}
            </ul>
            {order.status === 'delivered' ? (
              <p className="border-t border-line pt-3 text-sm text-ink-muted">
                {policySummary(
                  order.items.some((i) => i.returnOptions.some((o) => o.kind === 'return')) ||
                    order.items.every((i) => i.returnOptions.length === 0)
                    ? 'return'
                    : 'replacementOnly',
                )}
              </p>
            ) : null}
          </section>
        </div>

        <div className="space-y-5">
          <section aria-labelledby="payment" className={card}>
            <h3 id="payment" className="mb-3 font-semibold">
              Payment
            </h3>
            <dl className="space-y-1.5 text-[15px]">
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
              <div className={cn(row, 'border-t border-line pt-2 font-semibold')}>
                <dt>Total</dt>
                <dd className="tabular-nums">{formatInr(order.totalPaise)}</dd>
              </div>
              {refunded > 0 ? (
                <div className={cn(row, 'text-success')}>
                  <dt>Refunded</dt>
                  <dd className="tabular-nums">{formatInr(refunded)}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-3 text-sm text-ink-muted">
              {order.payment.method === 'cod'
                ? 'Cash on delivery'
                : `Paid by ${order.payment.method.toUpperCase()}${order.payment.bank ? ` (${order.payment.bank})` : ''}`}
            </p>
          </section>
          <section aria-labelledby="address" className={card}>
            <h3 id="address" className="mb-2 flex items-center gap-2 font-semibold">
              <MapPinIcon className="size-4" aria-hidden />
              Delivering to
            </h3>
            <address className="text-[15px] not-italic">
              {order.address.name}
              <br />
              {[order.address.line1, order.address.line2, order.address.landmark]
                .filter(Boolean)
                .join(', ')}
              <br />
              {order.address.city}, {order.address.state} {order.address.pincode}
              <br />
              <span className="text-ink-muted">{order.address.phone}</span>
            </address>
          </section>
        </div>
      </div>
    </div>
  );
}
