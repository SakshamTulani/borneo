import {
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  RotateCcwIcon,
  XCircleIcon,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type TimelineStep = { label: string; at?: string; status: 'done' | 'current' | 'upcoming' };
export type TimelineOutcome = { kind: 'cancelled' | 'returnRequested'; label: string; at?: string };

const statusText = { done: 'Completed', current: 'Current step', upcoming: 'Upcoming' };

export function OrderTimeline({
  steps,
  outcome,
}: {
  steps: TimelineStep[];
  outcome?: TimelineOutcome;
}) {
  return (
    <div className="space-y-3">
      {outcome ? (
        <p
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
            outcome.kind === 'cancelled' ? 'bg-danger-soft text-danger' : 'bg-info-soft text-info',
          )}
        >
          {outcome.kind === 'cancelled' ? (
            <XCircleIcon className="size-4" aria-hidden />
          ) : (
            <RotateCcwIcon className="size-4" aria-hidden />
          )}
          {outcome.label}
          {outcome.at ? <span className="font-normal">· {outcome.at}</span> : null}
        </p>
      ) : null}
      <ol className="space-y-0" aria-label="Order progress">
        {steps.map((s, i) => (
          <li
            key={s.label}
            aria-current={s.status === 'current' ? 'step' : undefined}
            className="relative flex gap-3 pb-5 last:pb-0"
          >
            {i < steps.length - 1 ? (
              <span
                className={cn(
                  'absolute top-6 left-[11px] h-[calc(100%-1.5rem)] w-0.5',
                  s.status === 'done' ? 'bg-success' : 'bg-line',
                )}
                aria-hidden
              />
            ) : null}
            {s.status === 'done' ? (
              <CheckCircle2Icon className="size-6 shrink-0 text-success" aria-hidden />
            ) : s.status === 'current' ? (
              <CircleDotIcon className="size-6 shrink-0 text-brand" aria-hidden />
            ) : (
              <CircleIcon className="size-6 shrink-0 text-line-strong" aria-hidden />
            )}
            <div>
              <p
                className={cn(
                  'text-sm',
                  s.status === 'upcoming' ? 'text-ink-muted' : 'font-medium',
                  s.status === 'current' && 'text-brand',
                )}
              >
                {s.label}
                <span className="sr-only">, {statusText[s.status]}</span>
              </p>
              {s.at ? <p className="text-xs text-ink-muted">{s.at}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
