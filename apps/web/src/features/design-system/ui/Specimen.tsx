import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/base/badge';

/** A component with its states. Every specimen is labelled as demo data. */
type SpecimenProps = { title: string; note?: string; columns?: 2 | 4; children: ReactNode };

export function Specimen({ title, note, columns = 2, children }: SpecimenProps) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="demo">Demo data</Badge>
      </header>
      {note ? <p className="text-sm text-ink-muted">{note}</p> : null}
      <div
        className={
          columns === 4
            ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid grid-cols-1 gap-4 sm:grid-cols-2'
        }
      >
        {children}
      </div>
    </section>
  );
}

export function State({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <figure className={wide ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
      <figcaption className="text-xs font-medium tracking-wide text-ink-muted uppercase">
        {label}
      </figcaption>
      <div>{children}</div>
    </figure>
  );
}
