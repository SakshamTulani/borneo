import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import type { CategoryLink } from '../model';

export function CategoryGrid({ categories }: { categories: CategoryLink[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((c) => (
        <li key={c.slug}>
          <Link
            to="/categories/$slug"
            params={{ slug: c.slug }}
            className="group flex min-h-32 flex-col justify-between gap-6 rounded-xl border border-line bg-surface p-5 outline-none hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-6"
          >
            <span className="font-heading text-tagline font-semibold tracking-tight">{c.name}</span>
            <span className="inline-flex items-center gap-1 text-sm text-brand">
              Shop
              <ArrowRightIcon
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
