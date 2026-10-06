import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="px-4 py-3 text-xl font-bold text-brand">borneo</header>
      <main className="px-4">{children}</main>
    </div>
  );
}
