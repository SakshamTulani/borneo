import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Logo } from './brand/Logo';
import { BottomNav } from './navigation/BottomNav';

/**
 * Page frame: skip link, header (logo + `nav` on desktop), main, footer, and the mobile bottom nav.
 * `nav` is composed by the root route (category links come from the catalog feature).
 */
export function AppShell({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only z-30 rounded-md bg-surface px-4 py-3 font-medium text-brand focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4">
          <Link to="/" aria-label="Borneo home" className="inline-flex shrink-0 rounded-md">
            <Logo />
          </Link>
          {nav ? <div className="hidden min-w-0 lg:block">{nav}</div> : null}
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 lg:pb-12">
        {children}
      </main>
      <footer className="border-t border-line pb-20 lg:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-ink-muted">
          Prices include GST. Delivery across India.
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
