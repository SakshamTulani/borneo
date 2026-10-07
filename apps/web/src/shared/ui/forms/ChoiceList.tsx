import { useId, type ReactNode } from 'react';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/base/radio-group';
import { cn } from '@/shared/lib/utils';

export type Choice = { value: string; title: ReactNode; detail?: ReactNode; disabled?: boolean };

/** One choice among cards (address, payment method, plan, offer). Keyboard: arrows move. */
export function ChoiceList({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: Choice[];
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <RadioGroup aria-label={label} value={value ?? ''} onValueChange={onChange} className="gap-2">
      {choices.map((c) => (
        <label
          key={c.value}
          htmlFor={`${id}-${c.value}`}
          className={cn(
            'flex min-h-11 items-start gap-3 rounded-xl border border-line bg-surface p-4',
            c.disabled
              ? 'cursor-not-allowed bg-canvas text-ink-muted'
              : 'cursor-pointer hover:border-line-strong has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:shadow-[inset_0_0_0_1px_var(--brand)]',
          )}
        >
          <RadioGroupItem
            id={`${id}-${c.value}`}
            value={c.value}
            disabled={c.disabled}
            className="mt-0.5"
          />
          <span className="min-w-0 space-y-0.5">
            <span className="block font-semibold">{c.title}</span>
            {c.detail ? <span className="block text-sm text-ink-muted">{c.detail}</span> : null}
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}
