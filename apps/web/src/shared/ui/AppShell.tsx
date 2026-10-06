import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Logo } from './brand/Logo';
import { Container } from './layout/Container';
import { BottomNav } from './navigation/BottomNav';
import { CartLink } from './navigation/CartLink';

/**
 * Page frame: skip link, shipping line, frosted header (logo, `search`, `account` and cart on desktop; `nav` on a second desktop row), full-width main (pages use
 * `Container`; full-bleed tiles don't), parchment footer, and the mobile bottom nav.
 * `nav`, `search` and `account` are composed by the root route (they come from features).
 */
export function AppShell({
  children,
  nav,
  search,
  account,
  cartCount,
}: {
  children: ReactNode;
  nav?: ReactNode;
  search?: ReactNode;
  /** Sign-in / account link (desktop; mobile uses the bottom nav). */
  account?: ReactNode;
  /** Units in the cart (header link and bottom nav); undefined until known. */
  cartCount?: number | undefined;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only z-30 rounded-full bg-surface px-5 py-3 font-semibold text-brand focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      {/* Shipping line (owner request): true of every order; it scrolls away with the page. */}
      <p className="bg-brand px-4 py-2 text-center text-xs font-medium text-brand-ink sm:text-sm">
        Free delivery on every order
        <span className="hidden sm:inline">
          <span aria-hidden className="mx-2 text-brand-soft">
            ·
          </span>
          Cash on delivery where available
          <span aria-hidden className="mx-2 text-brand-soft">
            ·
          </span>
          7-day returns or replacement
        </span>
      </p>
      <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/80 backdrop-blur-xl backdrop-saturate-150">
        <Container className="flex h-16 items-center gap-4 lg:gap-8">
          <Link to="/" aria-label="Borneo home" className="inline-flex shrink-0 rounded-sm">
            <Logo />
          </Link>
          {search ? <div className="mx-auto w-full max-w-xl min-w-0">{search}</div> : null}
          {account ? <div className="hidden shrink-0 lg:block">{account}</div> : null}
          <div className="hidden shrink-0 lg:block">
            <CartLink count={cartCount} />
          </div>
        </Container>
        {/* Categories get their own row so they never crowd the search (owner feedback, Phase I). */}
        {nav ? (
          <div className="hidden border-t border-line/50 lg:block">
            <Container className="flex h-11 items-center overflow-x-auto">{nav}</Container>
          </div>
        ) : null}
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
      <BottomNav cartCount={cartCount} />
    </div>
  );
}
