import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Logo } from './brand/Logo';
import { Container } from './layout/Container';
import { BottomNav } from './navigation/BottomNav';

/**
 * Page frame: skip link, frosted header (logo, `nav` on desktop, `search`), full-width main (pages use
 * `Container`; full-bleed tiles don't), parchment footer, and the mobile bottom nav.
 * `nav` and `search` are composed by the root route (they come from features).
 */
export function AppShell({
  children,
  nav,
  search,
}: {
  children: ReactNode;
  nav?: ReactNode;
  search?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only z-30 rounded-full bg-surface px-5 py-3 font-semibold text-brand focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/80 backdrop-blur-xl backdrop-saturate-150">
        <Container className="flex h-16 items-center gap-4 lg:gap-8">
          <Link to="/" aria-label="Borneo home" className="inline-flex shrink-0 rounded-sm">
            <Logo />
          </Link>
          {nav ? <div className="hidden min-w-0 lg:block">{nav}</div> : null}
          {search ? (
            <div className="ml-auto w-full max-w-xs min-w-0 xl:max-w-sm">{search}</div>
          ) : null}
        </Container>
      </header>
      <main id="main" tabIndex={-1} className="w-full flex-1 pb-24 outline-none lg:pb-16">
        {children}
      </main>
      <footer className="border-t border-line bg-canvas pb-20 lg:pb-0">
        <Container className="flex flex-col gap-1 py-8 text-xs text-ink-muted sm:flex-row sm:justify-between">
          <p>Prices include GST. Delivery across India.</p>
          <p>© Borneo. Demo store.</p>
        </Container>
      </footer>
      <BottomNav />
    </div>
  );
}
