import { Link } from '@tanstack/react-router';
import { HomeIcon, LayoutGridIcon } from 'lucide-react';

const item =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset data-[status=active]:text-brand';

/**
 * Mobile bottom navigation (D-160). Search, cart and account join it in their phases (G, J, I).
 * Hidden from 1024px, where the header carries navigation.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
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
      </ul>
    </nav>
  );
}
