import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, CompassIcon, PlugZapIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { imageSource } from '@/shared/lib/image';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { PriceBlock } from '@/shared/ui/commerce/PriceBlock';
import { StatusBadge } from '@/shared/ui/commerce/StatusBadge';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Container } from '@/shared/ui/layout/Container';
import { useCategoriesQuery } from '../hooks/useCategoriesQuery';
import { useNewestProductsQuery } from '../hooks/useNewestProductsQuery';
import type { CatalogCard, CategoryLink } from '../model';
import { CategoryGrid } from './CategoryGrid';
import { HOME_BANNERS, type HomeBanner } from './homeContent';
import { ProductGrid, ProductGridSkeleton } from './ProductGrid';

/** The hero product plus two rows of four. */
export const HOME_NEWEST = 9;

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

function Section({
  id,
  title,
  action,
  tone = 'canvas',
  children,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  tone?: 'canvas' | 'surface';
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn('py-12 sm:py-16', tone === 'surface' ? 'bg-surface' : 'bg-canvas')}
    >
      <Container className="space-y-6 sm:space-y-8">
        <div className="flex items-end justify-between gap-4">
          <h2 id={id} className="font-heading text-headline tracking-tight sm:text-title">
            {title}
          </h2>
          {action}
        </div>
        {children}
      </Container>
    </section>
  );
}

/** The hero is the newest launch (D-181): its photo, real price and a way in. No slogans. */
function ProductHero({ card }: { card: CatalogCard }) {
  return (
    <section aria-labelledby="home-hero" className="bg-surface">
      <Container className="grid items-center gap-8 py-8 sm:py-12 md:grid-cols-2 lg:gap-16 lg:py-16">
        <div className="order-2 space-y-6 md:order-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              Just launched
            </span>
            {card.badges?.map((b, i) => (
              <StatusBadge key={i} {...b} />
            ))}
          </div>
          <div className="space-y-2">
            {card.familyLabel ? <p className="text-ink-muted">{card.familyLabel}</p> : null}
            <h2
              id="home-hero"
              className="font-heading text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-display"
            >
              {card.name}
            </h2>
          </div>
          <PriceBlock {...card.price} size="lg" unavailable={card.availability === 'outOfStock'} />
          <div className="flex flex-wrap gap-3">
            {/* The label starts with the visible text (WCAG 2.5.3). */}
            <Button asChild size="lg">
              <Link
                to="/products/$slug"
                params={{ slug: card.slug }}
                aria-label={`View details of the ${card.name}`}
              >
                View details
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/categories">Browse categories</Link>
            </Button>
          </div>
        </div>
        <div className="order-1 aspect-square overflow-hidden rounded-xl bg-muted md:order-2">
          {card.image ? (
            <img
              src={card.image.src}
              {...(card.image.srcSet
                ? { srcSet: card.image.srcSet, sizes: '(min-width: 768px) 50vw, 100vw' }
                : {})}
              alt={card.image.alt}
              fetchPriority="high"
              className="size-full object-cover"
            />
          ) : null}
        </div>
      </Container>
    </section>
  );
}

function ProductHeroSkeleton() {
  return (
    <div aria-busy="true" className="bg-surface">
      <span className="sr-only">Loading the latest launch</span>
      <Container className="grid items-center gap-8 py-8 sm:py-12 md:grid-cols-2 lg:gap-16 lg:py-16">
        <div className="order-2 space-y-4 md:order-1">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-14 w-3/4" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
        <Skeleton className="order-1 aspect-square w-full rounded-xl md:order-2" />
      </Container>
    </div>
  );
}

function Banner({ banner }: { banner: HomeBanner }) {
  const img = imageSource(banner.image, {
    aspect: banner.wide ? 21 / 9 : 4 / 3,
    widths: banner.wide ? [800, 1400, 2000] : [600, 1000],
  });
  return (
    <li className={cn(banner.wide && 'md:col-span-2')}>
      <Link
        to="/categories/$slug"
        params={{ slug: banner.categorySlug }}
        className={cn(
          'group relative flex overflow-hidden rounded-xl bg-tile text-on-tile outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          banner.wide ? 'aspect-[4/3] sm:aspect-[21/9]' : 'aspect-[4/3]',
        )}
      >
        <img
          src={img.src}
          {...(img.srcSet
            ? {
                srcSet: img.srcSet,
                sizes: banner.wide ? '100vw' : '(min-width: 768px) 50vw, 100vw',
              }
            : {})}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        <span
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
          aria-hidden
        />
        <span className="relative mt-auto flex flex-col gap-2 p-6 sm:p-8">
          <span className="text-sm font-semibold text-brand-on-tile">{banner.eyebrow}</span>
          <span className="font-heading text-headline font-semibold tracking-tight sm:text-title">
            {banner.title}
          </span>
          <span className="text-on-tile-muted">{banner.body}</span>
          <span className="mt-2 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-on-tile px-5 text-[15px] text-ink transition-colors group-hover:bg-white">
            {banner.cta}
            <ArrowRightIcon className="size-4" aria-hidden />
          </span>
        </span>
      </Link>
    </li>
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
 * Hybrid home (D-120, D-181): products first. The hero is the newest launch, the next launches
 * follow, then category banners, categories with artwork, and mindset entry points. Same for everyone; the upgrade strip for
 * signed-in customers arrives with accounts (D-121).
 */
export function HomePage() {
  const categories = useCategoriesQuery();
  const newest = useNewestProductsQuery(HOME_NEWEST);
  const all = categories.data ?? [];
  const entries = ENTRY_POINTS.map((e) => ({
    ...e,
    categories: all.filter((c) => c.homeEntry === e.key),
  })).filter((e) => e.categories.length > 0);
  const [hero, ...rest] = newest.data ?? [];
  const banners = HOME_BANNERS.filter((b) => all.some((c) => c.slug === b.categorySlug));

  return (
    <>
      <h1 className="sr-only">Borneo: phones, audio and home tech, direct</h1>
      {newest.isPending ? <ProductHeroSkeleton /> : hero ? <ProductHero card={hero} /> : null}
      <Section
        id="home-new"
        title="Latest launches"
        action={
          <Link
            to="/categories"
            className="hidden min-h-11 items-center gap-1 text-brand hover:underline sm:inline-flex"
          >
            All categories
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        }
      >
        {newest.isPending ? (
          <ProductGridSkeleton count={4} />
        ) : newest.isError ? (
          <ErrorState title="Couldn't load products" onRetry={() => void newest.refetch()} />
        ) : rest.length ? (
          <ProductGrid cards={rest} />
        ) : !hero ? (
          <EmptyState title="New launches are on their way" />
        ) : null}
      </Section>

      {banners.length ? (
        <section aria-label="Featured" className="bg-canvas pb-12 sm:pb-16">
          <Container>
            <ul className="grid gap-5 md:grid-cols-2">
              {banners.map((b) => (
                <Banner key={b.key} banner={b} />
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

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
    </>
  );
}
