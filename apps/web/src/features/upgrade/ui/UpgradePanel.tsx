import { Link } from '@tanstack/react-router';
import { ArrowUpRightIcon } from 'lucide-react';
import { useSessionQuery } from '@/features/auth';
import { StatusBadge } from '@/shared/ui/commerce/StatusBadge';
import { useUpgradeForQuery } from '../hooks/useUpgradeForQuery';

/**
 * On a product page, for signed-in owners of an older or lower model in the line (D-130–132):
 * "Upgrade from your X", then what you gain against it (D-133, D-226). Nothing otherwise.
 */
export function UpgradePanel({ slug }: { slug: string }) {
  const { data: customer } = useSessionQuery();
  const { data } = useUpgradeForQuery(slug, Boolean(customer));
  if (!data?.badge) return null;
  const { badge, gains, changes } = data;
  return (
    <section
      aria-labelledby="upgrade-h"
      className="space-y-3 rounded-xl border border-brand/30 bg-brand-soft/50 p-5"
    >
      <StatusBadge kind="upgradeAvailable" />
      <h2 id="upgrade-h" className="font-semibold">
        Upgrade from your{' '}
        <Link
          to="/products/$slug"
          params={{ slug: badge.fromSlug }}
          className="text-brand underline-offset-4 hover:underline"
        >
          {badge.fromName}
        </Link>
      </h2>
      {gains.length ? (
        <>
          <h3 className="text-sm font-semibold">What you gain</h3>
          <ul className="space-y-1.5 text-[15px]">
            {gains.map((g) => (
              <li key={g.label} className="flex flex-wrap items-baseline gap-x-2">
                <ArrowUpRightIcon
                  className="size-4 shrink-0 self-center text-success"
                  aria-hidden
                />
                <span className="font-medium">{g.label}:</span>
                {g.from ? <span className="text-ink-muted line-through">{g.from}</span> : null}
                <span>{g.to}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {changes.length ? (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer content-center font-medium">
            Also different ({changes.length})
          </summary>
          <ul className="space-y-1 pb-1">
            {changes.map((c) => (
              <li key={c.label}>
                {c.label}: {c.from ?? 'Not stated'} → {c.to ?? 'Not stated'}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
