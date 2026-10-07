import { Link } from '@tanstack/react-router';
import { RotateCcwIcon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { formatDay } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/base/badge';
import { Button } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { useAdvanceReturnMutation } from '../hooks/useAdvanceReturnMutation';
import { useReturnsQuery } from '../hooks/useReturnsQuery';
import { kindLabel, reasonLabel, RETURN_STATUS_LABELS } from '../mappers/orderText';

const tone = {
  requested: 'info',
  approved: 'brand',
  completed: 'success',
  rejected: 'danger',
} as const;

/** Every return and replacement request, newest first (D-86, D-219). */
export function ReturnsPage() {
  const query = useReturnsQuery();
  const advance = useAdvanceReturnMutation();
  if (query.isError && !query.data)
    return <ErrorState title="Couldn't load your returns" onRetry={() => void query.refetch()} />;
  if (!query.data) return <Skeleton className="h-40 w-full" aria-label="Loading your returns" />;
  const items = query.data.pages.flatMap((p) => p.items);
  if (items.length === 0)
    return (
      <EmptyState
        icon={<RotateCcwIcon className="size-9" strokeWidth={1.5} />}
        title="No returns"
        body="After delivery you have 7 days to ask for a return or replacement from the order page."
      />
    );
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="space-y-2 rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {kindLabel(r.kind)} · {r.productName}
              </p>
              <Badge variant={tone[r.status]}>{RETURN_STATUS_LABELS[r.status]}</Badge>
            </div>
            <p className="text-sm text-ink-muted">
              {reasonLabel(r.reason)} · asked {formatDay(new Date(r.createdAt).toISOString())} ·{' '}
              <Link
                to="/account/orders/$orderId"
                params={{ orderId: r.orderId }}
                className="text-brand hover:underline"
              >
                order {r.orderNumber}
              </Link>
            </p>
            {r.details ? <p className="text-[15px]">“{r.details}”</p> : null}
            {r.refundPaise ? (
              <p className="text-sm font-semibold text-success">
                {formatInr(r.refundPaise)} refunded to your original payment method
              </p>
            ) : null}
            {r.demoNextStatus ? (
              <Button
                variant="secondary"
                loading={advance.isPending && advance.variables === r.id}
                onClick={() => advance.mutate(r.id)}
              >
                Demo: mark {RETURN_STATUS_LABELS[r.demoNextStatus].split(':')[0]!.toLowerCase()}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show older requests
        </Button>
      ) : null}
    </div>
  );
}
