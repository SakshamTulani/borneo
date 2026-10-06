import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { CircleXIcon, InfoIcon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { errorMessage } from '@/shared/lib/errors';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { Countdown } from '@/shared/ui/commerce/Countdown';
import { DemoBox } from '@/shared/ui/feedback/DemoBox';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { Container } from '@/shared/ui/layout/Container';
import { useMockPaymentMutation } from '../hooks/useMockPaymentMutation';
import { useOrderQuery } from '../hooks/useOrderQuery';
import { useRetryPaymentMutation } from '../hooks/useRetryPaymentMutation';
import { noticeText, paidWith } from '../mappers/checkoutText';
import type { OrderView } from '../model';

type Props = { orderId: string; onConfirmed: (order: OrderView) => void };

/**
 * Paying (D-56–D-59). The items are held for 5 minutes from payment start, with the real end
 * time counting down; it never resets (D-56). In the demo the gateway is a mock with three
 * outcomes (D-213). After the hold, the page says what happened (D-57, D-59).
 */
export function PaymentPage({ orderId, onConfirmed }: Props) {
  const query = useOrderQuery(orderId);
  const pay = useMockPaymentMutation();
  const retry = useRetryPaymentMutation();
  const order = query.data;

  useEffect(() => {
    if (order?.status === 'confirmed') onConfirmed(order);
  }, [order, onConfirmed]);

  let body;
  if (query.isError && !order) {
    body = <ErrorState title="Couldn't load your order" onRetry={() => void query.refetch()} />;
  } else if (!order) {
    body = <Skeleton className="h-72 w-full" aria-label="Loading payment" />;
  } else if (order.status === 'pending_payment') {
    const attemptId = order.payment.attemptId;
    const act = (result: 'success' | 'failure' | 'lateSuccess') =>
      attemptId && pay.mutate({ id: order.id, attemptId, result });
    body = (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-surface p-5">
          <div>
            <p className="text-sm text-ink-muted">Order {order.number}</p>
            <p className="font-heading text-headline font-semibold tabular-nums">
              {formatInr(order.totalPaise)}
            </p>
            <p className="text-sm text-ink-muted">{paidWith(order)}</p>
          </div>
          {order.holdExpiresAt ? (
            <Countdown
              label="Your items are held"
              endsAt={new Date(order.holdExpiresAt).toISOString()}
            />
          ) : null}
        </div>
        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          If payment doesn't finish before the timer ends, the items go back to stock and nothing is
          charged.
        </p>
        {order.notice ? <FormAlert>{noticeText(order)}</FormAlert> : null}
        {pay.isError ? <FormAlert>{errorMessage(pay.error)}</FormAlert> : null}

        {attemptId ? (
          <DemoBox title="Demo mode: mock payment gateway">
            <p className="mb-3">
              No money moves. Choose what the bank does with this payment of{' '}
              {formatInr(order.totalPaise)}.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                loading={pay.isPending && pay.variables?.result === 'success'}
                onClick={() => act('success')}
              >
                Pay {formatInr(order.totalPaise)}
              </Button>
              <Button variant="outline" disabled={pay.isPending} onClick={() => act('failure')}>
                Payment fails
              </Button>
              <Button variant="outline" disabled={pay.isPending} onClick={() => act('lateSuccess')}>
                Succeeds after the hold ends
              </Button>
            </div>
            {pay.variables?.result === 'lateSuccess' && pay.isSuccess ? (
              <p className="mt-3" role="status">
                The bank will confirm 10 seconds after your hold ends. Stay on this page to see what
                happens.
              </p>
            ) : null}
          </DemoBox>
        ) : (
          <Button size="lg" loading={retry.isPending} onClick={() => retry.mutate(order.id)}>
            Try paying again
          </Button>
        )}
      </div>
    );
  } else {
    // Cancelled after the hold, or refunded after a late payment; confirmed moves on.
    body = (
      <div className="space-y-4 rounded-xl bg-surface p-5">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <CircleXIcon className="size-5 text-danger" aria-hidden />
          {order.status === 'refunded' ? 'Payment refunded' : 'Order cancelled'}
        </p>
        <p role="status">{noticeText(order) ?? 'This order is no longer waiting for payment.'}</p>
        {order.status === 'cancelled' ? (
          <p className="text-sm text-ink-muted">
            If your bank still confirms this payment, we'll confirm the order if the items are free,
            or refund you in full.
          </p>
        ) : null}
        <Link to="/cart" className={buttonVariants()}>
          Back to your cart
        </Link>
      </div>
    );
  }

  return (
    <Container className="max-w-2xl space-y-6 pt-6 pb-10">
      <h1 className="font-heading text-title tracking-tight">Payment</h1>
      {body}
    </Container>
  );
}
