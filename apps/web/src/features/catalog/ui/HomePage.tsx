import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, CompassIcon, PlugZapIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/base/button';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Container } from '@/shared/ui/layout/Container';
import { useCategoriesQuery } from '../hooks/useCategoriesQuery';
import { useNewestProductsQuery } from '../hooks/useNewestProductsQuery';
import type { CategoryLink } from '../model';
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

const sectionTitle = 'font-heading text-headline tracking-tight';

function Section({
  id,
  title,
  tone = 'canvas',
  children,
}: {
  id: string;
  title: string;
  tone?: 'canvas' | 'surface';
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn('py-12 sm:py-16', tone === 'surface' ? 'bg-surface' : 'bg-canvas')}
    >
      <Container className="space-y-6">
        <h2 id={id} className={sectionTitle}>
          {title}
        </h2>
        {children}
      </Container>
    </section>
  );
}

function EntryPoint({
  icon,
  title,
  body,
  categories,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  categories: CategoryLink[];
}) {
  return (
    <li className="flex flex-col gap-4 rounded-xl bg-canvas p-6 sm:p-8">
      <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
        {icon}
      </span>
      <div className="space-y-1">
        <h3 className="font-heading text-tagline tracking-tight">{title}</h3>
        <p className="text-ink-muted">{body}</p>
      </div>
      <p className="-ml-3 flex flex-wrap">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to="/categories/$slug"
            params={{ slug: c.slug }}
            className="group inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-brand outline-none hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            {c.name}
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </Link>
        ))}
      </p>
    </li>
  );
}

/**
 * Hybrid home (D-120): a dark hero tile, categories, mindset entry points and new launches,
 * alternating surfaces instead of borders. Same for everyone; the upgrade strip for signed-in
 * customers arrives with accounts (D-121).
 */
export function HomePage() {
  const categories = useCategoriesQuery();
  const newest = useNewestProductsQuery(HOME_NEWEST);
  const entries = ENTRY_POINTS.map((e) => ({
    ...e,
    categories: (categories.data ?? []).filter((c) => c.homeEntry === e.key),
  })).filter((e) => e.categories.length > 0);
  const heroCategories = (categories.data ?? []).filter((c) => c.homeEntry === 'helpMeChoose');

  return (
    <>
      <section aria-labelledby="home-hero" className="bg-tile text-on-tile">
        <Container className="flex flex-col items-center gap-5 py-20 text-center sm:py-28">
          <h1
            id="home-hero"
            className="max-w-3xl font-heading text-[2.25rem] leading-[1.07] font-semibold tracking-[-0.03em] sm:text-display"
          >
            Electronics that work together.
          </h1>
          <p className="max-w-xl text-lg text-on-tile-muted sm:text-tagline sm:leading-snug">
            Straight from Borneo. Real prices, real delivery dates, plain-language policies.
          </p>
          {heroCategories.length ? (
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {heroCategories.map((c, i) => (
                <Button key={c.slug} asChild variant={i === 0 ? 'default' : 'onTile'}>
                  <Link to="/categories/$slug" params={{ slug: c.slug }}>
                    Shop {c.name.toLowerCase()}
                  </Link>
                </Button>
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      <Section id="home-categories" title="Shop by category">
        {categories.isError ? (
          <ErrorState title="Couldn't load categories" onRetry={() => void categories.refetch()} />
        ) : categories.isPending ? (
          <p className="text-sm text-ink-muted">Loading categories…</p>
        ) : (
          <CategoryGrid categories={categories.data} />
        )}
      </Section>

      {entries.length ? (
        <Section id="home-start" title="Where to start" tone="surface">
          <ul className="grid gap-5 md:grid-cols-2">
            {entries.map((e) => (
              <EntryPoint
                key={e.key}
                icon={e.icon}
                title={e.title}
                body={e.body}
                categories={e.categories}
              />
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="home-new" title="New launches">
        {newest.isPending ? (
          <ProductGridSkeleton count={HOME_NEWEST} />
        ) : newest.isError ? (
          <ErrorState title="Couldn't load products" onRetry={() => void newest.refetch()} />
        ) : newest.data.length ? (
          <ProductGrid cards={newest.data} />
        ) : (
          <EmptyState title="New launches are on their way" />
        )}
      </Section>
    </>
  );
}
