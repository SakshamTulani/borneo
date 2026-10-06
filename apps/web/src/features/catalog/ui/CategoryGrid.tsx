import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import type { CategoryLink } from '../model';

export function CategoryGrid({ categories }: { categories: CategoryLink[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((c) => (
        <li key={c.slug}>
          <Link
            to="/categories/$slug"
            params={{ slug: c.slug }}
            className="group flex min-h-20 items-center justify-between gap-2 rounded-xl border border-line bg-surface p-4 font-heading font-semibold outline-none hover:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {c.name}
            <ArrowRightIcon
              className="size-4 shrink-0 text-ink-muted group-hover:text-brand"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
