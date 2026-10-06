import type { ReactNode } from 'react';
import { FlaskConicalIcon } from 'lucide-react';

/** On-screen stand-in for outbound messages in DEMO_MODE (D-95, D-101). Never shown in production. */
export function DemoBox({
  title = 'Demo mode: this would be emailed',
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside
      role="note"
      aria-label={title}
      className="rounded-xl border border-demo bg-demo-soft p-4 text-sm text-ink"
    >
      <p className="mb-1 flex items-center gap-2 font-semibold text-demo">
        <FlaskConicalIcon className="size-4" aria-hidden />
        {title}
      </p>
      {children}
    </aside>
  );
}
