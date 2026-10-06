import { formatDateTime, formatDuration } from '@/shared/lib/format';
import { useNow } from '@/shared/lib/useNow';
import { cn } from '@/shared/lib/utils';

type Props = {
  /** The real sale end (D-140). Never reset or extended client-side. */
  endsAt: string;
  startsAt?: string;
  label?: string;
  /** Below this the timer turns urgent and is announced once. */
  urgentBelowMs?: number;
  /** Pins the clock (demos, tests). Omit in product code. */
  now?: number;
};

type Phase = 'pending' | 'upcoming' | 'live' | 'urgent' | 'ended';

export function Countdown({
  endsAt,
  startsAt,
  label = 'Flash sale',
  urgentBelowMs = 60_000,
  now: frozen,
}: Props) {
  const now = useNow(frozen);
  const end = Date.parse(endsAt);
  const start = startsAt ? Date.parse(startsAt) : undefined;

  let phase: Phase = 'pending';
  if (now !== undefined) {
    if (start !== undefined && now < start) phase = 'upcoming';
    else if (now >= end) phase = 'ended';
    else phase = end - now < urgentBelowMs ? 'urgent' : 'live';
  }

  const target = phase === 'upcoming' ? start! : end;
  const prefix = {
    pending: 'Ends',
    upcoming: 'Starts in',
    live: 'Ends in',
    urgent: 'Ends in',
    ended: 'Ended',
  }[phase];

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-0.5 rounded-xl px-4 py-3',
        phase === 'urgent'
          ? 'bg-warning-soft text-warning'
          : phase === 'ended'
            ? 'bg-muted text-ink-muted'
            : 'bg-offer-soft text-offer',
      )}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span
        role="timer"
        className="font-heading text-tagline font-semibold tracking-tight tabular-nums"
      >
        {prefix}{' '}
        {phase === 'pending' || phase === 'ended'
          ? formatDateTime(endsAt)
          : formatDuration(target - now!)}
      </span>
      {phase !== 'pending' && phase !== 'ended' ? (
        <span className="text-xs">
          {phase === 'upcoming'
            ? `Starts ${formatDateTime(startsAt!)}`
            : `Ends ${formatDateTime(endsAt)}`}
        </span>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {phase === 'urgent' ? 'Less than a minute left' : phase === 'ended' ? `${label} ended` : ''}
      </span>
    </div>
  );
}
