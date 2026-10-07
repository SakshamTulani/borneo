import { Link } from '@tanstack/react-router';
import { useCategoriesQuery } from '../hooks/useCategoriesQuery';

/** Desktop header links to every category, from config (D-10: none hardcoded). */
export function CategoryNav() {
  const { data } = useCategoriesQuery();
  if (!data?.length) return null;
  return (
    <nav aria-label="Categories">
      <ul className="-ml-3 flex items-center gap-1">
        {data.map((c) => (
          <li key={c.slug}>
            <Link
              to="/categories/$slug"
              params={{ slug: c.slug }}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm whitespace-nowrap text-ink/80 outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-brand data-[status=active]:font-semibold data-[status=active]:text-brand"
            >
              {c.name}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/deals"
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-medium whitespace-nowrap text-offer outline-none hover:underline focus-visible:outline-2 focus-visible:outline-brand data-[status=active]:font-semibold"
          >
            Deals
          </Link>
        </li>
      </ul>
    </nav>
  );
}
