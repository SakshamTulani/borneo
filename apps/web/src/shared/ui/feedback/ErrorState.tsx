import { AlertTriangleIcon, RotateCwIcon } from 'lucide-react';
import { Button } from '@/shared/ui/base/button';
import { cn } from '@/shared/lib/utils';

type Props = { title: string; body?: string; onRetry?: () => void; className?: string };

export function ErrorState({ title, body, onRetry, className }: Props) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl bg-danger-soft px-6 py-10 text-center',
        className,
      )}
    >
      <AlertTriangleIcon className="size-8 text-danger" aria-hidden />
      <p className="font-heading text-lg font-semibold text-danger">{title}</p>
      {body ? <p className="max-w-sm text-sm text-ink">{body}</p> : null}
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          <RotateCwIcon aria-hidden />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
