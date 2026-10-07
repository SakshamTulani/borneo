import type { ReactNode } from 'react';
import { ArrowUpCircleIcon } from 'lucide-react';
import { useSessionQuery } from '@/features/auth';
import { Container } from '@/shared/ui/layout/Container';
import { useUpgradeStripQuery } from '../hooks/useUpgradeStripQuery';
import type { UpgradeStripView } from '../model';

/**
 * Home "Upgrade available" strip for signed-in owners (D-121, D-136): one card per owned line
 * with a newer generation. `renderCard` draws the product card (from the catalog feature).
 */
export function UpgradeStrip({
  renderCard,
}: {
  renderCard: (item: UpgradeStripView['items'][number]) => ReactNode;
}) {
  const { data: customer } = useSessionQuery();
  const { data } = useUpgradeStripQuery(Boolean(customer));
  if (!data?.items.length) return null;
  return (
    <section aria-labelledby="upgrades-h" className="bg-surface py-10">
      <Container className="space-y-5">
        <h2
          id="upgrades-h"
          className="flex items-center gap-2 font-heading text-tagline font-semibold"
        >
          <ArrowUpCircleIcon className="size-6 text-brand" aria-hidden />
          Upgrade available
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {data.items.map((item) => (
            <li key={item.to.id} className="flex flex-col gap-2">
              <p className="text-sm text-ink-muted">From your {item.from.name}</p>
              {renderCard(item)}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
