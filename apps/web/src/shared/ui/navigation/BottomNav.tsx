import { Link } from '@tanstack/react-router';
import { HomeIcon, LayoutGridIcon, SearchIcon } from 'lucide-react';

const item =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-ink-muted outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand data-[status=active]:font-semibold data-[status=active]:text-brand';

/**
 * Mobile bottom navigation (D-160). Cart and account join it in their phases (J, I).
 * Hidden from 1024px, where the header carries navigation.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line/70 bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="flex">
        <li className="flex flex-1">
          <Link to="/" activeOptions={{ exact: true }} className={item}>
            <HomeIcon className="size-5" aria-hidden />
            Home
          </Link>
        </li>
        <li className="flex flex-1">
          <Link to="/categories" className={item}>
            <LayoutGridIcon className="size-5" aria-hidden />
            Categories
          </Link>
        </li>
        <li className="flex flex-1">
          <Link to="/search" className={item}>
            <SearchIcon className="size-5" aria-hidden />
            Search
          </Link>
        </li>
      </ul>
    </nav>
  );
}
