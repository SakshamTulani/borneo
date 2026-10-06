import type { ReactNode } from 'react';
import { Container } from '@/shared/ui/layout/Container';

/** Centred white card for the sign-in, sign-up and reset pages. */
export function AuthCard({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Container className="py-10 sm:py-16">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-heading text-headline font-semibold tracking-tight">{title}</h1>
          {intro ? <p className="text-ink-muted">{intro}</p> : null}
        </div>
        <div className="space-y-5 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          {children}
        </div>
        {footer ? <p className="text-center text-[15px] text-ink-muted">{footer}</p> : null}
      </div>
    </Container>
  );
}
