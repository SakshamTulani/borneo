import { Link } from '@tanstack/react-router';
import { CompassIcon, PlugZapIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { useCategoriesQuery } from '../hooks/useCategoriesQuery';
import { useNewestProductsQuery } from '../hooks/useNewestProductsQuery';
import { CategoryGrid } from './CategoryGrid';
import { ProductGrid, ProductGridSkeleton } from './ProductGrid';

export const HOME_NEWEST = 4;

/** Entry points with somewhere real to go today. Deals and Upgrade join in Phases J, M and N. */
const ENTRY_POINTS = [
  {
    key: 'helpMeChoose',
    icon: <CompassIcon className="size-5" aria-hidden />,
    title: 'Help me choose',
    body: "Full specs for every model, with who each one is for and who it isn't.",
  },
  {
    key: 'buildYourSetup',
    icon: <PlugZapIcon className="size-5" aria-hidden />,
    title: 'Build your setup',
    body: 'Chargers, cases and smart home devices, with compatibility stated as facts.',
  },
] as const;

const entryLink =
  'inline-flex min-h-11 items-center rounded-md px-3 font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand';

function EntryPoint({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-xl border border-line bg-surface p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        {icon}
      </span>
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
        <p className="text-sm text-ink-muted">{body}</p>
        <p className="-ml-3 flex flex-wrap">{children}</p>
      </div>
    </li>
  );
}

/**
 * Hybrid home (D-120): categories, mindset entry points and new launches. Same for everyone;
 * the upgrade strip for signed-in customers arrives with accounts (D-121).
 */
export function HomePage() {
  const categories = useCategoriesQuery();
  const newest = useNewestProductsQuery(HOME_NEWEST);

  return (
    <div className="space-y-12 py-8">
      <section className="space-y-3">
        <h1 className="max-w-2xl font-heading text-4xl font-bold tracking-tight">
          Electronics that work together, straight from Borneo.
        </h1>
        <p className="max-w-xl text-lg text-ink-muted">
          Real prices, real delivery dates and plain-language policies. Choose what fits you.
        </p>
      </section>

      <section aria-labelledby="home-categories" className="space-y-4">
        <h2 id="home-categories" className="font-heading text-2xl font-semibold">
          Shop by category
        </h2>
        {categories.isError ? (
          <ErrorState title="Couldn't load categories" onRetry={() => void categories.refetch()} />
        ) : categories.isPending ? (
          <p className="text-sm text-ink-muted">Loading categories…</p>
        ) : (
          <CategoryGrid categories={categories.data} />
        )}
      </section>

      {categories.data?.some((c) => c.homeEntry) ? (
        <section aria-labelledby="home-start" className="space-y-4">
          <h2 id="home-start" className="font-heading text-2xl font-semibold">
            Where to start
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {ENTRY_POINTS.map((e) => {
              const listed = (categories.data ?? []).filter((c) => c.homeEntry === e.key);
              return listed.length ? (
                <EntryPoint key={e.key} icon={e.icon} title={e.title} body={e.body}>
                  {listed.map((c) => (
                    <Link
                      key={c.slug}
                      to="/categories/$slug"
                      params={{ slug: c.slug }}
                      className={entryLink}
                    >
                      {c.name}
                    </Link>
                  ))}
                </EntryPoint>
              ) : null;
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="home-new" className="space-y-4">
        <h2 id="home-new" className="font-heading text-2xl font-semibold">
          New launches
        </h2>
        {newest.isPending ? (
          <ProductGridSkeleton count={HOME_NEWEST} />
        ) : newest.isError ? (
          <ErrorState title="Couldn't load products" onRetry={() => void newest.refetch()} />
        ) : newest.data.length ? (
          <ProductGrid cards={newest.data} />
        ) : (
          <EmptyState title="New launches are on their way" />
        )}
      </section>
    </div>
  );
}
