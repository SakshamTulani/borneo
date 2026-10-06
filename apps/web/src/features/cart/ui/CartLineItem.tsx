import { Link } from '@tanstack/react-router';
import { AlertCircleIcon, ImageIcon, RotateCcwIcon, TruckIcon, ZapIcon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { formatDateRange, formatDateTime } from '@/shared/lib/format';
import { imageSource } from '@/shared/lib/image';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/base/button';
import { QuantityStepper } from '@/shared/ui/commerce/QuantityStepper';
import { StatusBadge } from '@/shared/ui/commerce/StatusBadge';
import { lineDeliveryText, lineStatusText, optionsText } from '../mappers/cartText';
import type { CartLineView } from '../model';

type Props = {
  line: CartLineView;
  busy: boolean;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
};

function Thumb({ image }: { image: { src: string; alt: string } | null }) {
  return (
    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:size-24">
      {image ? (
        <img
          {...imageSource(image.src, { widths: [96, 192], aspect: 1 })}
          sizes="96px"
          alt={image.alt}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <ImageIcon className="size-6 text-ink-muted" aria-hidden />
      )}
    </div>
  );
}

/** One cart line: what, how many, its price, delivery, return policy and any problem (D-84, D-198). */
export function CartLineItem({ line, busy, onQtyChange, onRemove }: Props) {
  const problem = lineStatusText(line);
  const delivery = lineDeliveryText(line, formatDateRange);
  const lead = line.product ?? line.members[0] ?? null;
  const blocked = line.status === 'unavailable' || line.status === 'outOfStock';

  return (
    <li className="flex gap-4 py-5" aria-label={line.name}>
      <Thumb image={lead?.image ?? null} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            {line.product ? (
              <Link
                to="/products/$slug"
                params={{ slug: line.product.slug }}
                search={{ variant: line.product.sku }}
                className="font-semibold hover:underline"
              >
                {line.name}
              </Link>
            ) : (
              <p className="font-semibold">{line.name}</p>
            )}
            {line.product && Object.keys(line.product.options).length ? (
              <p className="text-sm text-ink-muted">{optionsText(line.product.options)}</p>
            ) : null}
            {line.kind === 'bundle' ? (
              <ul className="text-sm text-ink-muted" aria-label="In this bundle">
                {line.members.map((m) => (
                  <li key={m.sku}>
                    {m.qty > 1 ? `${m.qty} × ` : ''}
                    {m.name}
                    {Object.keys(m.options).length ? ` (${optionsText(m.options)})` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="text-right">
            <p className={cn('font-semibold tabular-nums', blocked && 'text-ink-muted')}>
              {blocked ? '—' : formatInr(line.linePaise)}
            </p>
            {line.couponDiscountPaise > 0 ? (
              <p className="text-sm text-offer tabular-nums">
                −{formatInr(line.couponDiscountPaise)} coupon
              </p>
            ) : null}
          </div>
        </div>

        {line.kind === 'bundle' ? <StatusBadge kind="bundle" /> : null}
        {line.isPreorder ? <StatusBadge kind="preorder" /> : null}
        {line.flash ? (
          <p className="flex items-start gap-1.5 text-sm">
            <ZapIcon className="mt-0.5 size-4 shrink-0 text-offer" aria-hidden />
            <span>
              1 at the flash sale price {formatInr(line.flash.unitPricePaise)} until{' '}
              {formatDateTime(new Date(line.flash.endsAt).toISOString())}
              {line.qty > 1 ? `; the rest at ${formatInr(line.unitPricePaise)} each` : ''}. Limit 1
              per customer.
            </span>
          </p>
        ) : !blocked ? (
          <p className="text-sm text-ink-muted tabular-nums">
            {formatInr(line.unitPricePaise)} each
          </p>
        ) : null}

        {problem ? (
          <p className="flex items-start gap-1.5 text-sm text-danger" role="status">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {problem}
          </p>
        ) : null}
        {delivery ? (
          <p
            className={cn(
              'flex items-start gap-1.5 text-sm',
              delivery.ok ? 'text-success' : 'text-danger',
            )}
          >
            <TruckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {delivery.text}
          </p>
        ) : null}

        {(line.product ? [line.product] : line.members).map((p) => (
          <p key={p.sku} className="flex items-start gap-1.5 text-xs text-ink-muted">
            <RotateCcwIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              {line.kind === 'bundle' ? `${p.name}: ` : ''}
              {p.returnPolicy}
            </span>
          </p>
        ))}

        <div className="flex items-center gap-2 pt-1">
          {!blocked ? (
            <QuantityStepper
              value={line.qty}
              max={line.maxQty}
              label={line.name}
              disabled={busy}
              onChange={onQtyChange}
            />
          ) : null}
          <Button
            variant="ghost"
            onClick={onRemove}
            disabled={busy}
            aria-label={`Remove ${line.name}`}
          >
            Remove
          </Button>
        </div>
      </div>
    </li>
  );
}
