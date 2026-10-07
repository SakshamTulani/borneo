import { useId } from 'react';
import { StarIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const WORDS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** 1–5 stars as a radio group: arrows move, the choice is announced with its word. */
export function StarInput({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (rating: number) => void;
  error?: string | undefined;
}) {
  const name = useId();
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-semibold">Your rating</legend>
      <div className="flex items-center gap-1">
        {WORDS.map((word, i) => {
          const n = i + 1;
          return (
            <label
              key={n}
              className="cursor-pointer rounded-full p-1.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand"
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="sr-only"
                aria-label={`${n} star${n > 1 ? 's' : ''}: ${word}`}
              />
              <StarIcon
                aria-hidden
                className={cn(
                  'size-8',
                  n <= value ? 'fill-current text-warning' : 'text-line-strong',
                )}
              />
            </label>
          );
        })}
        {value ? <span className="ml-2 text-sm text-ink-muted">{WORDS[value - 1]}</span> : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </fieldset>
  );
}
