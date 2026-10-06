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
        'flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-6 py-10 text-center',
        className,
      )}
    >
      <span className="text-ink-muted" aria-hidden>
        {icon ?? <InboxIcon className="size-8" />}
      </span>
      <p className="font-heading text-lg font-semibold">{title}</p>
      {body ? <p className="max-w-sm text-sm text-ink-muted">{body}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
