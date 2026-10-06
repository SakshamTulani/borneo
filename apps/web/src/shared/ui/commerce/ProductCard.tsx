import { Link, type RegisteredRouter, type ValidateLinkOptions } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { BellIcon, BellRingIcon, ImageIcon } from 'lucide-react';
import { Button } from '@/shared/ui/base/button';
import { cn } from '@/shared/lib/utils';
import { PriceBlock, type PriceBlockProps } from './PriceBlock';
import { Rating } from './Rating';
import { StatusBadge, type StatusBadgeProps } from './StatusBadge';

export type ProductCardProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TOptions = unknown,
> = {
  name: string;
  /** Router link to the product page, e.g. `{ to: '/products/$slug', params: { slug } }`. */
  link: ValidateLinkOptions<TRouter, TOptions>;
  familyLabel?: string;
  /** Square photo; `srcSet` from `imageSource`. */
  image?: { src: string; alt: string; srcSet?: string };
  rating: { value?: number; count: number };
  price: PriceBlockProps;
  badges?: StatusBadgeProps[];
  availability: 'inStock' | 'outOfStock' | 'preorder';
  watching?: boolean;
  onWatchToggle?: () => void;
  /** Above the fold: load the photo eagerly at high priority. */
  priority?: boolean;
  className?: string;
};

export function ProductCard<TRouter extends RegisteredRouter, TOptions>(
  props: ProductCardProps<TRouter, TOptions>,
): ReactNode;
export function ProductCard(props: ProductCardProps) {
  const {
    name,
    link,
    familyLabel,
    image,
    rating,
    price,
    badges = [],
    availability,
    watching,
    onWatchToggle,
    priority,
    className,
  } = props;
  return (
    <article
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl bg-surface p-3 transition-shadow duration-300 hover:shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)] sm:p-4',
        className,
      )}
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[12px] bg-muted">
        {image ? (
          <img
            src={image.src}
            {...(image.srcSet
              ? {
                  srcSet: image.srcSet,
                  sizes: '(min-width: 1280px) 300px, (min-width: 768px) 30vw, 46vw',
                }
              : {})}
            alt={image.alt}
            {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
            decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <ImageIcon className="size-10 text-line-strong" aria-hidden />
        )}
        {badges.length ? (
          <ul
            className="absolute top-2.5 left-2.5 flex flex-wrap gap-1"
            aria-label="Product status"
          >
            {badges.map((b, i) => (
              <li key={i}>
                <StatusBadge {...b} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        {familyLabel ? <p className="text-xs text-ink-muted">{familyLabel}</p> : null}
        <h3 className="font-heading text-base leading-snug font-semibold">
          {/* Stretched link: the whole card opens the product; the Watch button sits above it. */}
          <Link
            {...link}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
          >
            {name}
          </Link>
        </h3>
        {/* Cards show a rating only once verified reviews exist; the PDP says "No reviews yet" (D-150). */}
        {rating.count > 0 ? <Rating {...rating} /> : null}
        <PriceBlock
          {...price}
          size="sm"
          unavailable={availability === 'outOfStock'}
          className="mt-auto pt-2"
        />
      </div>
      {availability === 'outOfStock' && onWatchToggle ? (
        <Button
          variant={watching ? 'secondary' : 'outline'}
          onClick={onWatchToggle}
          aria-pressed={watching ?? false}
          className="relative z-10 self-start"
        >
          {watching ? <BellRingIcon aria-hidden /> : <BellIcon aria-hidden />}
          {watching ? 'Watching' : 'Watch'}
        </Button>
      ) : null}
    </article>
  );
}
