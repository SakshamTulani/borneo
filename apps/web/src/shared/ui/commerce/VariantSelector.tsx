import { useId } from 'react';
import { RadioGroup } from 'radix-ui';
import { cn } from '@/shared/lib/utils';

export type VariantOption = { value: string; label: string; available: boolean; swatch?: string };

type Props = {
  legend: string;
  options: VariantOption[];
  value: string;
  onValueChange: (value: string) => void;
};

export function VariantSelector({ legend, options, value, onValueChange }: Props) {
  const legendId = useId();
  const selected = options.find((o) => o.value === value);
  return (
    <div className="space-y-2">
      <p id={legendId} className="text-sm font-medium">
        {legend}: <span className="text-ink-muted">{selected?.label ?? 'Choose one'}</span>
      </p>
      <RadioGroup.Root
        aria-labelledby={legendId}
        value={value}
        onValueChange={onValueChange}
        className="flex flex-wrap gap-2"
      >
        {options.map((o) => (
          <RadioGroup.Item
            key={o.value}
            value={o.value}
            disabled={!o.available}
            aria-label={o.available ? o.label : `${o.label}, out of stock`}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-sm',
              'data-[state=checked]:border-brand data-[state=checked]:bg-brand-soft data-[state=checked]:font-semibold data-[state=checked]:text-brand',
              'disabled:cursor-not-allowed disabled:border-dashed disabled:bg-muted disabled:text-ink-muted',
            )}
          >
            {o.swatch ? (
              <span
                className="size-4 rounded-full border border-line-strong"
                style={{ background: o.swatch }}
                aria-hidden
              />
            ) : null}
            <span className={cn(!o.available && 'line-through')}>{o.label}</span>
            {!o.available ? <span className="text-xs no-underline">Out of stock</span> : null}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
