import type { ReactNode } from 'react';
import { InboxIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type Props = {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, body, action, icon, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl bg-surface px-6 py-14 text-center',
        className,
      )}
    >
      <span className="mb-1 text-line-strong" aria-hidden>
        {icon ?? <InboxIcon className="size-9" strokeWidth={1.5} />}
      </span>
      <p className="font-heading text-tagline font-semibold tracking-tight">{title}</p>
      {body ? <p className="max-w-sm text-sm text-ink-muted">{body}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
