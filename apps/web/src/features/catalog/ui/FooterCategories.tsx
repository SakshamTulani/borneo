import { Link } from '@tanstack/react-router';
import { footerLinkClass } from '@/shared/ui/navigation/SiteFooter';
import { useCategoriesQuery } from '../hooks/useCategoriesQuery';

/** Footer "Shop" list: every category from config (D-10, D-224). */
export function FooterCategories() {
  const { data } = useCategoriesQuery();
  return (
    <ul>
      {(data ?? []).map((c) => (
        <li key={c.slug}>
          <Link to="/categories/$slug" params={{ slug: c.slug }} className={footerLinkClass}>
            {c.name}
          </Link>
        </li>
      ))}
      <li>
        <Link to="/categories" className={footerLinkClass}>
          All categories
        </Link>
      </li>
    </ul>
  );
}
