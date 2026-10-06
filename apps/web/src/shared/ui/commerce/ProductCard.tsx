import { BellIcon, BellRingIcon, ImageIcon } from 'lucide-react';
import { Button } from '@/shared/ui/base/button';
import { cn } from '@/shared/lib/utils';
import { PriceBlock, type PriceBlockProps } from './PriceBlock';
import { Rating } from './Rating';
import { StatusBadge, type StatusBadgeProps } from './StatusBadge';

export type ProductCardProps = {
  name: string;
  href: string;
  familyLabel?: string;
  image?: { src: string; alt: string };
  rating: { value?: number; count: number };
  price: PriceBlockProps;
  badges?: StatusBadgeProps[];
  availability: 'inStock' | 'outOfStock' | 'preorder';
  watching?: boolean;
  onWatchToggle?: () => void;
  className?: string;
};

export function ProductCard(props: ProductCardProps) {
  const {
    name,
    href,
    familyLabel,
    image,
    rating,
    price,
    badges = [],
    availability,
    watching,
    onWatchToggle,
    className,
  } = props;
  return (
    <article
      className={cn(
        'relative flex flex-col gap-3 rounded-xl border border-line bg-surface p-3',
        className,
      )}
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted">
        {image ? (
          <img src={image.src} alt={image.alt} className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-10 text-ink-muted" aria-hidden />
        )}
      </div>
      {badges.length ? (
        <ul className="flex flex-wrap gap-1" aria-label="Product status">
          {badges.map((b, i) => (
            <li key={i}>
              <StatusBadge {...b} />
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        {familyLabel ? <p className="text-xs font-medium text-ink-muted">{familyLabel}</p> : null}
        <h3 className="font-heading text-base font-semibold">
          {/* Stretched link: the whole card opens the product; the Watch button sits above it. */}
          <a
            href={href}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-brand"
          >
            {name}
          </a>
        </h3>
      </div>
      <Rating {...rating} />
      <PriceBlock {...price} unavailable={availability === 'outOfStock'} />
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
