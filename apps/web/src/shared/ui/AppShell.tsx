import type { ReactNode } from 'react';
import { Logo } from './brand/Logo';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="px-4 py-3">
        <a href="/" aria-label="Borneo home" className="inline-flex rounded-md">
          <Logo />
        </a>
      </header>
      <main className="px-4">{children}</main>
    </div>
  );
}
