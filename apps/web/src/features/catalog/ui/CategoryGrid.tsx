import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { imageSource } from '@/shared/lib/image';
import type { CategoryLink } from '../model';
import { CATEGORY_ART } from './homeContent';

export function CategoryGrid({ categories }: { categories: CategoryLink[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((c) => {
        const art = CATEGORY_ART[c.slug];
        const img = art ? imageSource(art, { aspect: 4 / 3, widths: [400, 700] }) : undefined;
        return (
          <li key={c.slug}>
            <Link
              to="/categories/$slug"
              params={{ slug: c.slug }}
              className="group flex h-full flex-col overflow-hidden rounded-xl bg-surface outline-none transition-shadow duration-300 hover:shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {img ? (
                <span className="block aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={img.src}
                    {...(img.srcSet
                      ? { srcSet: img.srcSet, sizes: '(min-width: 1024px) 25vw, 50vw' }
                      : {})}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                </span>
              ) : null}
              <span className="flex flex-1 items-center justify-between gap-3 p-4 sm:p-5">
                <span className="font-heading text-base font-semibold tracking-tight sm:text-tagline">
                  {c.name}
                </span>
                <ArrowRightIcon
                  className="size-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
