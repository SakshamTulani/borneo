import {
  CalendarClockIcon,
  CheckIcon,
  CreditCardIcon,
  PackageIcon,
  TicketIcon,
} from 'lucide-react';
import { Badge } from '@/shared/ui/base/badge';
import { Button } from '@/shared/ui/base/button';
import { cn } from '@/shared/lib/utils';

export type OfferKind = 'bank' | 'coupon' | 'noCostEmi' | 'bundle';

type Props = {
  kind: OfferKind;
  title: string;
  description: string;
  code?: string;
  /** Eligibility comes from the offer-stacking rule (D-35–37). */
  status: 'available' | 'applied' | 'notApplicable';
  reason?: string;
  onApply?: () => void;
};

const icons = {
  bank: CreditCardIcon,
  coupon: TicketIcon,
  noCostEmi: CalendarClockIcon,
  bundle: PackageIcon,
};
const kindLabel = {
  bank: 'Bank offer',
  coupon: 'Coupon',
  noCostEmi: 'No-cost EMI',
  bundle: 'Bundle offer',
};

export function OfferCard({ kind, title, description, code, status, reason, onApply }: Props) {
  const Icon = icons[kind];
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border p-4',
        status === 'notApplicable' ? 'border-line bg-muted' : 'border-offer/30 bg-offer-soft',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-5 shrink-0',
          status === 'notApplicable' ? 'text-ink-muted' : 'text-offer',
        )}
        aria-hidden
      />
      <div className="flex-1 space-y-1">
        <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
          {kindLabel[kind]}
        </p>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-ink">{description}</p>
        {code ? (
          <p className="text-sm">
            Code{' '}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono font-semibold">{code}</code>
          </p>
        ) : null}
        {status === 'notApplicable' && reason ? (
          <p className="text-sm text-ink-muted">Not applicable: {reason}</p>
        ) : null}
      </div>
      <div className="self-center">
        {status === 'available' && onApply ? (
          <Button variant="outline" onClick={onApply} aria-label={`Apply ${title}`}>
            Apply
          </Button>
        ) : null}
        {status === 'applied' ? (
          <Badge variant="success">
            <CheckIcon aria-hidden />
            Applied
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
