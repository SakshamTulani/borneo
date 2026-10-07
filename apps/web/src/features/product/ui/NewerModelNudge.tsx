import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, SparklesIcon } from 'lucide-react';
import { formatInr, type ProductDetail } from '@borneo/shared';

/**
 * "Newer model available" for everyone (D-237): the newest sold generation in the line, or a
 * higher tier of this one. Facts only (name, price, pre-order), no urgency (D-06, D-140).
 */
export function NewerModelNudge({ newer }: { newer: NonNullable<ProductDetail['newerModel']> }) {
  const headline = newer.kind === 'newerGeneration' ? 'Newer model available' : 'Want more?';
  return (
    <Link
      to="/products/$slug"
      params={{ slug: newer.slug }}
      className="group flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/60 p-4 outline-none hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
    >
      <SparklesIcon className="size-5 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0 flex-1 text-[15px]">
        <span className="block font-semibold">{headline}</span>
        <span className="block text-ink-muted">
          {newer.kind === 'newerGeneration' ? 'See the' : 'Step up to the'} {newer.name}
          {` · ${formatInr(newer.pricePaise)}`}
          {newer.preorder ? ' · pre-order' : ''}
        </span>
      </span>
      <ArrowRightIcon
        className="size-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
