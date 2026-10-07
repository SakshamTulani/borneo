import { useEffect } from 'react';
import { track } from '@/features/analytics';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, ScaleIcon, XIcon } from 'lucide-react';
import { COMPARE_MAX_MOBILE } from '@borneo/shared';
import { toCatalogCard } from '@/features/catalog';
import { cn } from '@/shared/lib/utils';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { PriceBlock } from '@/shared/ui/commerce/PriceBlock';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Container } from '@/shared/ui/layout/Container';
import { useCompareQuery } from '../hooks/useCompareQuery';

/**
 * Compare (D-122, D-227): up to 4 side by side on desktop; on mobile the first 3, two in view,
 * swipe for the third. "Only differences" hides rows where every value is the same.
 */
export function ComparePage({
  category,
  slugs,
  onChange,
}: {
  category: string;
  slugs: string[];
  onChange: (slugs: string[]) => void;
}) {
  const query = useCompareQuery(category, slugs);
  const [onlyDiff, setOnlyDiff] = useState(false);
  const view = query.data;
  const shown = view?.products.length;
  useEffect(() => {
    if (shown) track('compare_view', { category, products: shown });
  }, [category, shown]);
  if (query.isError && !view)
    return (
      <Container className="py-10">
        <ErrorState title="Couldn't load the comparison" onRetry={() => void query.refetch()} />
      </Container>
    );
  if (!view)
    return (
      <Container className="py-10">
        <Skeleton className="h-96 w-full" aria-label="Loading the comparison" />
      </Container>
    );
  const back = (
    <Link
      to="/categories/$slug"
      params={{ slug: view.category.slug }}
      search={slugs.length ? { compare: slugs.join(',') } : {}}
      className="inline-flex min-h-11 items-center gap-1 text-[15px] text-brand hover:underline"
    >
      <ArrowLeftIcon className="size-4" aria-hidden />
      Back to {view.category.name.toLowerCase()}
    </Link>
  );
  if (view.products.length < 2)
    return (
      <Container className="space-y-4 py-8">
        {back}
        <EmptyState
          icon={<ScaleIcon className="size-9" strokeWidth={1.5} />}
          title="Choose at least two to compare"
          body={`Tick “Compare” on products in ${view.category.name.toLowerCase()}.`}
          action={
            <Link
              to="/categories/$slug"
              params={{ slug: view.category.slug }}
              className={buttonVariants()}
            >
              Browse {view.category.name.toLowerCase()}
            </Link>
          }
        />
      </Container>
    );

  const rows = onlyDiff ? view.rows.filter((r) => r.differs) : view.rows;
  // Mobile shows the first 3 (D-122); the 4th column is desktop only.
  const col = (i: number) =>
    cn(
      'w-[46vw] min-w-[46vw] snap-start px-3 align-top sm:w-auto sm:min-w-0',
      i >= COMPARE_MAX_MOBILE && 'hidden sm:table-cell',
    );

  return (
    <Container className="space-y-5 py-8">
      {back}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-title tracking-tight">
          Compare {view.category.name.toLowerCase()}
        </h1>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[15px]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--brand)]"
            checked={onlyDiff}
            onChange={(e) => setOnlyDiff(e.target.checked)}
          />
          Only differences
        </label>
      </div>
      {view.products.length > COMPARE_MAX_MOBILE ? (
        <p className="text-sm text-ink-muted sm:hidden">
          Showing the first {COMPARE_MAX_MOBILE} on this screen. Swipe to see the third.
        </p>
      ) : null}
      <div className="-mx-4 snap-x snap-mandatory overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full border-separate border-spacing-0 text-[15px]">
          <caption className="sr-only">
            {view.products.map((p) => p.name).join(' compared with ')}
          </caption>
          <thead>
            <tr>
              <td className="sticky left-0 z-10 w-28 bg-canvas sm:w-44" />
              {view.products.map((p, i) => {
                const card = toCatalogCard(p);
                return (
                  <th key={p.id} scope="col" className={cn(col(i), 'pb-4 text-left font-normal')}>
                    <div className="space-y-2">
                      {card.image ? (
                        <img
                          src={card.image.src}
                          {...(card.image.srcSet ? { srcSet: card.image.srcSet } : {})}
                          sizes="(min-width: 640px) 20vw, 46vw"
                          alt=""
                          className="aspect-square w-full rounded-xl bg-surface object-cover"
                        />
                      ) : null}
                      <Link
                        to="/products/$slug"
                        params={{ slug: p.slug }}
                        className="block font-semibold hover:underline"
                      >
                        {p.name}
                      </Link>
                      <PriceBlock {...card.price} size="sm" />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => onChange(slugs.filter((s) => s !== p.slug))}
                      >
                        <XIcon aria-hidden />
                      </Button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={cn(r.differs && 'bg-brand-soft/40')}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-t border-line bg-canvas py-3 pr-3 text-left text-sm font-semibold"
                >
                  {r.label}
                  {r.differs ? <span className="sr-only"> (differs)</span> : null}
                </th>
                {r.values.map((v, i) => (
                  <td key={i} className={cn(col(i), 'border-t border-line py-3')}>
                    {v ?? <span className="text-ink-muted">Not stated</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Container>
  );
}
