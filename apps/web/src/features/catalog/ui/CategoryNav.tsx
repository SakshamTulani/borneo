import { Link } from '@tanstack/react-router';
import { useCategoriesQuery } from '../hooks/useCategoriesQuery';

/** Desktop header links to every category, from config (D-10: none hardcoded). */
export function CategoryNav() {
  const { data } = useCategoriesQuery();
  if (!data?.length) return null;
  return (
    <nav aria-label="Categories">
      <ul className="flex items-center gap-1">
        {data.map((c) => (
          <li key={c.slug}>
            <Link
              to="/categories/$slug"
              params={{ slug: c.slug }}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-ink-muted outline-none hover:bg-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-brand data-[status=active]:text-brand"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
